import { describe, expect, it } from "vitest";

import type {
  ResolvedWorkflowConfig,
  StageDefinition,
  StagesConfig,
} from "../../src/config/types.js";
import type { Issue } from "../../src/domain/model.js";
import {
  OrchestratorCore,
  type OrchestratorCoreOptions,
} from "../../src/orchestrator/core.js";
import type { IssueTracker } from "../../src/tracker/tracker.js";

describe("orchestrator stage machine", () => {
  it("dispatches with stage info when stages are configured", async () => {
    const spawnCalls: Array<{
      stageName: string | null;
      stageType: string | null;
    }> = [];
    const orchestrator = createStagedOrchestrator({
      onSpawn: (input) => {
        spawnCalls.push({
          stageName: input.stageName,
          stageType: input.stage?.type ?? null,
        });
      },
    });

    await orchestrator.pollTick();

    expect(spawnCalls).toEqual([
      { stageName: "investigate", stageType: "agent" },
    ]);
    expect(orchestrator.getState().issueStages["1"]).toBe("investigate");
  });

  it("advances to next stage on normal worker exit", async () => {
    const orchestrator = createStagedOrchestrator();

    await orchestrator.pollTick();
    expect(orchestrator.getState().issueStages["1"]).toBe("investigate");

    // Normal exit from investigate stage
    orchestrator.onWorkerExit({
      issueId: "1",
      outcome: "normal",
    });

    // Should advance to "implement"
    expect(orchestrator.getState().issueStages["1"]).toBe("implement");
  });

  it("completes when reaching terminal stage", async () => {
    const orchestrator = createStagedOrchestrator({
      stages: createSimpleTwoStageConfig(),
    });

    await orchestrator.pollTick();
    expect(orchestrator.getState().issueStages["1"]).toBe("implement");

    // Normal exit advances to "done" (terminal)
    const retryEntry = orchestrator.onWorkerExit({
      issueId: "1",
      outcome: "normal",
    });

    // Should be completed — no retry scheduled, stage cleaned up
    expect(retryEntry).toBeNull();
    expect(orchestrator.getState().issueStages["1"]).toBeUndefined();
    expect(orchestrator.getState().completed.has("1")).toBe(true);
  });

  it("does not dispatch workers for gate stages", async () => {
    const spawnCalls: unknown[] = [];
    const orchestrator = createStagedOrchestrator({
      stages: createGateWorkflowConfig(),
      onSpawn: () => {
        spawnCalls.push(true);
      },
    });

    // First dispatch puts issue in "implement" (agent stage)
    await orchestrator.pollTick();
    expect(spawnCalls).toHaveLength(1);

    // Normal exit advances to "review" (gate stage)
    orchestrator.onWorkerExit({
      issueId: "1",
      outcome: "normal",
    });
    expect(orchestrator.getState().issueStages["1"]).toBe("review");

    // Retry timer fires — should try to dispatch but gate stage blocks it
    const retryResult = await orchestrator.onRetryTimer("1");
    // Gate stages don't spawn workers
    expect(retryResult.dispatched).toBe(false);
  });

  it("approves a gate stage and advances to on_approve target", async () => {
    const orchestrator = createStagedOrchestrator({
      stages: createGateWorkflowConfig(),
    });

    await orchestrator.pollTick();
    orchestrator.onWorkerExit({ issueId: "1", outcome: "normal" });
    expect(orchestrator.getState().issueStages["1"]).toBe("review");

    // Approve the gate
    const nextStage = orchestrator.approveGate("1");
    expect(nextStage).toBe("merge");
    expect(orchestrator.getState().issueStages["1"]).toBe("merge");
  });

  it("reworks a gate stage and sends issue back to rework target", async () => {
    const orchestrator = createStagedOrchestrator({
      stages: createGateWorkflowConfig(),
    });

    await orchestrator.pollTick();
    orchestrator.onWorkerExit({ issueId: "1", outcome: "normal" });
    expect(orchestrator.getState().issueStages["1"]).toBe("review");

    // Reject (rework) the gate
    const reworkTarget = orchestrator.reworkGate("1");
    expect(reworkTarget).toBe("implement");
    expect(orchestrator.getState().issueStages["1"]).toBe("implement");
    expect(orchestrator.getState().issueReworkCounts["1"]).toBe(1);
  });

  it("escalates when rework count exceeds max_rework limit", async () => {
    const base = createGateWorkflowConfig();
    const stages: StagesConfig = {
      ...base,
      stages: {
        ...base.stages,
        review: { ...base.stages.review!, maxRework: 2 },
      },
    };

    const orchestrator = createStagedOrchestrator({ stages });

    await orchestrator.pollTick();
    orchestrator.onWorkerExit({ issueId: "1", outcome: "normal" });

    // Rework 1
    orchestrator.reworkGate("1");
    expect(orchestrator.getState().issueReworkCounts["1"]).toBe(1);

    // Rework 2
    orchestrator.getState().issueStages["1"] = "review";
    orchestrator.reworkGate("1");
    expect(orchestrator.getState().issueReworkCounts["1"]).toBe(2);

    // Rework 3 — should escalate since max_rework = 2
    orchestrator.getState().issueStages["1"] = "review";
    const result = orchestrator.reworkGate("1");
    expect(result).toBe("escalated");
    expect(orchestrator.getState().issueStages["1"]).toBeUndefined();
    expect(orchestrator.getState().issueReworkCounts["1"]).toBeUndefined();
    expect(orchestrator.getState().completed.has("1")).toBe(true);
  });

  it("preserves flat dispatch behavior when no stages configured", async () => {
    const spawnCalls: Array<{
      stageName: string | null;
      stageType: string | null;
    }> = [];
    const orchestrator = createStagedOrchestrator({
      stages: null,
      onSpawn: (input) => {
        spawnCalls.push({
          stageName: input.stageName,
          stageType: input.stage?.type ?? null,
        });
      },
    });

    await orchestrator.pollTick();

    expect(spawnCalls).toEqual([
      { stageName: null, stageType: null },
    ]);
    expect(orchestrator.getState().issueStages).toEqual({});
  });

  it("flat dispatch normal exit still schedules continuation retry", async () => {
    const orchestrator = createStagedOrchestrator({ stages: null });

    await orchestrator.pollTick();
    const retryEntry = orchestrator.onWorkerExit({
      issueId: "1",
      outcome: "normal",
    });

    expect(retryEntry).not.toBeNull();
    expect(retryEntry!.attempt).toBe(1);
    expect(retryEntry!.error).toBeNull();
  });

  it("tracks multiple issues in different stages independently", async () => {
    const orchestrator = createStagedOrchestrator({
      candidates: [
        createIssue({ id: "1", identifier: "ISSUE-1" }),
        createIssue({ id: "2", identifier: "ISSUE-2" }),
      ],
    });

    await orchestrator.pollTick();
    expect(orchestrator.getState().issueStages["1"]).toBe("investigate");
    expect(orchestrator.getState().issueStages["2"]).toBe("investigate");

    // Advance issue 1 only
    orchestrator.onWorkerExit({ issueId: "1", outcome: "normal" });
    expect(orchestrator.getState().issueStages["1"]).toBe("implement");
    expect(orchestrator.getState().issueStages["2"]).toBe("investigate");
  });

  it("abnormal exit does not advance stage", async () => {
    const orchestrator = createStagedOrchestrator();

    await orchestrator.pollTick();
    expect(orchestrator.getState().issueStages["1"]).toBe("investigate");

    orchestrator.onWorkerExit({
      issueId: "1",
      outcome: "abnormal",
      reason: "crashed",
    });

    // Stage should remain unchanged
    expect(orchestrator.getState().issueStages["1"]).toBe("investigate");
  });

  it("cleans up stage tracking when issue completes through terminal", async () => {
    const orchestrator = createStagedOrchestrator({
      stages: createSimpleTwoStageConfig(),
    });

    await orchestrator.pollTick();

    // Set a rework count to verify cleanup
    orchestrator.getState().issueReworkCounts["1"] = 2;

    orchestrator.onWorkerExit({ issueId: "1", outcome: "normal" });

    expect(orchestrator.getState().issueStages["1"]).toBeUndefined();
    expect(orchestrator.getState().issueReworkCounts["1"]).toBeUndefined();
  });
});

// --- Helpers ---

function createStagedOrchestrator(overrides?: {
  stages?: StagesConfig | null;
  candidates?: Issue[];
  onSpawn?: (input: {
    issue: Issue;
    attempt: number | null;
    stage: StageDefinition | null;
    stageName: string | null;
  }) => void;
}) {
  const stages = overrides?.stages !== undefined
    ? overrides.stages
    : createThreeStageConfig();

  const tracker = createTracker({
    candidates: overrides?.candidates ?? [
      createIssue({ id: "1", identifier: "ISSUE-1" }),
    ],
  });

  const options: OrchestratorCoreOptions = {
    config: createConfig({ stages }),
    tracker,
    spawnWorker: async (input) => {
      overrides?.onSpawn?.(input);
      return {
        workerHandle: { pid: 1001 },
        monitorHandle: { ref: "monitor-1" },
      };
    },
    now: () => new Date("2026-03-06T00:00:05.000Z"),
  };

  return new OrchestratorCore(options);
}

function createThreeStageConfig(): StagesConfig {
  return {
    initialStage: "investigate",
    stages: {
      investigate: {
        type: "agent",
        runner: "claude-code",
        model: "claude-opus-4",
        prompt: "investigate.liquid",
        maxTurns: 8,
        timeoutMs: null,
        concurrency: null,
        gateType: null,
        maxRework: null,
        reviewers: [],
        transitions: {
          onComplete: "implement",
          onApprove: null,
          onRework: null,
        },
      },
      implement: {
        type: "agent",
        runner: "claude-code",
        model: "claude-sonnet-4-5",
        prompt: "implement.liquid",
        maxTurns: 30,
        timeoutMs: null,
        concurrency: null,
        gateType: null,
        maxRework: null,
        reviewers: [],
        transitions: {
          onComplete: "done",
          onApprove: null,
          onRework: null,
        },
      },
      done: {
        type: "terminal",
        runner: null,
        model: null,
        prompt: null,
        maxTurns: null,
        timeoutMs: null,
        concurrency: null,
        gateType: null,
        maxRework: null,
        reviewers: [],
        transitions: { onComplete: null, onApprove: null, onRework: null },
      },
    },
  };
}

function createSimpleTwoStageConfig(): StagesConfig {
  return {
    initialStage: "implement",
    stages: {
      implement: {
        type: "agent",
        runner: "claude-code",
        model: "claude-sonnet-4-5",
        prompt: "implement.liquid",
        maxTurns: 30,
        timeoutMs: null,
        concurrency: null,
        gateType: null,
        maxRework: null,
        reviewers: [],
        transitions: {
          onComplete: "done",
          onApprove: null,
          onRework: null,
        },
      },
      done: {
        type: "terminal",
        runner: null,
        model: null,
        prompt: null,
        maxTurns: null,
        timeoutMs: null,
        concurrency: null,
        gateType: null,
        maxRework: null,
        reviewers: [],
        transitions: { onComplete: null, onApprove: null, onRework: null },
      },
    },
  };
}

function createGateWorkflowConfig(): StagesConfig {
  return {
    initialStage: "implement",
    stages: {
      implement: {
        type: "agent",
        runner: "claude-code",
        model: "claude-sonnet-4-5",
        prompt: "implement.liquid",
        maxTurns: 30,
        timeoutMs: null,
        concurrency: null,
        gateType: null,
        maxRework: null,
        reviewers: [],
        transitions: {
          onComplete: "review",
          onApprove: null,
          onRework: null,
        },
      },
      review: {
        type: "gate",
        runner: null,
        model: null,
        prompt: null,
        maxTurns: null,
        timeoutMs: null,
        concurrency: null,
        gateType: "ensemble",
        maxRework: 3,
        reviewers: [],
        transitions: {
          onComplete: null,
          onApprove: "merge",
          onRework: "implement",
        },
      },
      merge: {
        type: "agent",
        runner: "claude-code",
        model: "claude-sonnet-4-5",
        prompt: "merge.liquid",
        maxTurns: 5,
        timeoutMs: null,
        concurrency: null,
        gateType: null,
        maxRework: null,
        reviewers: [],
        transitions: {
          onComplete: "done",
          onApprove: null,
          onRework: null,
        },
      },
      done: {
        type: "terminal",
        runner: null,
        model: null,
        prompt: null,
        maxTurns: null,
        timeoutMs: null,
        concurrency: null,
        gateType: null,
        maxRework: null,
        reviewers: [],
        transitions: { onComplete: null, onApprove: null, onRework: null },
      },
    },
  };
}

function createTracker(input?: {
  candidates?: Issue[];
}): IssueTracker {
  return {
    async fetchCandidateIssues() {
      return input?.candidates ?? [createIssue({ id: "1", identifier: "ISSUE-1" })];
    },
    async fetchIssuesByStates() {
      return [];
    },
    async fetchIssueStatesByIds() {
      return input?.candidates?.map((issue) => ({
        id: issue.id,
        identifier: issue.identifier,
        state: issue.state,
      })) ?? [{ id: "1", identifier: "ISSUE-1", state: "In Progress" }];
    },
  };
}

function createConfig(overrides?: {
  stages?: StagesConfig | null;
}): ResolvedWorkflowConfig {
  return {
    workflowPath: "/tmp/WORKFLOW.md",
    promptTemplate: "Prompt",
    tracker: {
      kind: "linear",
      endpoint: "https://api.linear.app/graphql",
      apiKey: "token",
      projectSlug: "project",
      activeStates: ["Todo", "In Progress", "In Review"],
      terminalStates: ["Done", "Canceled"],
    },
    polling: {
      intervalMs: 30_000,
    },
    workspace: {
      root: "/tmp/workspaces",
    },
    hooks: {
      afterCreate: null,
      beforeRun: null,
      afterRun: null,
      beforeRemove: null,
      timeoutMs: 30_000,
    },
    agent: {
      maxConcurrentAgents: 2,
      maxTurns: 5,
      maxRetryBackoffMs: 300_000,
      maxConcurrentAgentsByState: {},
    },
    runner: {
      kind: "codex",
      model: null,
    },
    codex: {
      command: "codex-app-server",
      approvalPolicy: "never",
      threadSandbox: null,
      turnSandboxPolicy: null,
      turnTimeoutMs: 300_000,
      readTimeoutMs: 30_000,
      stallTimeoutMs: 300_000,
    },
    server: {
      port: null,
    },
    observability: {
      dashboardEnabled: true,
      refreshMs: 1_000,
      renderIntervalMs: 16,
    },
    stages: overrides?.stages !== undefined ? overrides.stages : null,
  };
}

function createIssue(overrides?: Partial<Issue>): Issue {
  return {
    id: overrides?.id ?? "1",
    identifier: overrides?.identifier ?? "ISSUE-1",
    title: overrides?.title ?? "Example issue",
    description: overrides?.description ?? null,
    priority: overrides?.priority ?? 1,
    state: overrides?.state ?? "In Progress",
    branchName: overrides?.branchName ?? null,
    url: overrides?.url ?? null,
    labels: overrides?.labels ?? [],
    blockedBy: overrides?.blockedBy ?? [],
    createdAt: overrides?.createdAt ?? "2026-03-01T00:00:00.000Z",
    updatedAt: overrides?.updatedAt ?? "2026-03-01T00:00:00.000Z",
  };
}
