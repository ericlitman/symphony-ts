import type { AgentRunnerCodexClient } from "../agent/runner.js";
import type { CodexTurnResult } from "../codex/app-server-client.js";
import type { ReviewerDefinition, StageDefinition } from "../config/types.js";
import type { Issue } from "../domain/model.js";

/**
 * Single reviewer verdict — the minimal JSON layer of the two-layer output.
 */
export interface ReviewerVerdict {
  role: string;
  model: string;
  verdict: "pass" | "fail";
}

/**
 * Full result from a single reviewer: verdict JSON + plain text feedback.
 */
export interface ReviewerResult {
  reviewer: ReviewerDefinition;
  verdict: ReviewerVerdict;
  feedback: string;
  raw: string;
}

/**
 * Aggregate result from all reviewers.
 */
export type AggregateVerdict = "pass" | "fail";

export interface EnsembleGateResult {
  aggregate: AggregateVerdict;
  results: ReviewerResult[];
  comment: string;
}

/**
 * Factory function type for creating a runner client for a reviewer.
 */
export type CreateReviewerClient = (reviewer: ReviewerDefinition) => AgentRunnerCodexClient;

/**
 * Function type for posting a comment to an issue tracker.
 */
export type PostComment = (issueId: string, body: string) => Promise<void>;

export interface EnsembleGateHandlerOptions {
  issue: Issue;
  stage: StageDefinition;
  createReviewerClient: CreateReviewerClient;
  postComment?: PostComment;
}

/**
 * Run the ensemble gate: spawn N reviewers in parallel, aggregate verdicts.
 */
export async function runEnsembleGate(
  options: EnsembleGateHandlerOptions,
): Promise<EnsembleGateResult> {
  const { issue, stage, createReviewerClient, postComment } = options;
  const reviewers = stage.reviewers;

  if (reviewers.length === 0) {
    return {
      aggregate: "pass",
      results: [],
      comment: "No reviewers configured — auto-passing gate.",
    };
  }

  const results = await Promise.all(
    reviewers.map((reviewer) =>
      runSingleReviewer(reviewer, issue, createReviewerClient),
    ),
  );

  const aggregate = aggregateVerdicts(results);
  const comment = formatGateComment(aggregate, results);

  if (postComment !== undefined) {
    try {
      await postComment(issue.id, comment);
    } catch {
      // Comment posting is best-effort — don't fail the gate on it.
    }
  }

  return { aggregate, results, comment };
}

/**
 * Aggregate individual verdicts: any FAIL = FAIL, else PASS.
 */
export function aggregateVerdicts(results: ReviewerResult[]): AggregateVerdict {
  if (results.length === 0) {
    return "pass";
  }

  return results.some((r) => r.verdict.verdict === "fail") ? "fail" : "pass";
}

/**
 * Run a single reviewer: create client, send prompt, parse output.
 */
async function runSingleReviewer(
  reviewer: ReviewerDefinition,
  issue: Issue,
  createReviewerClient: CreateReviewerClient,
): Promise<ReviewerResult> {
  const client = createReviewerClient(reviewer);
  try {
    const prompt = buildReviewerPrompt(reviewer, issue);
    const title = `Review: ${issue.identifier} (${reviewer.role})`;
    const result: CodexTurnResult = await client.startSession({ prompt, title });
    const raw = result.message ?? "";
    return parseReviewerOutput(reviewer, raw);
  } catch (error) {
    // Reviewer failure is treated as a FAIL verdict.
    const message =
      error instanceof Error ? error.message : "Reviewer process failed";
    return {
      reviewer,
      verdict: {
        role: reviewer.role,
        model: reviewer.model ?? "unknown",
        verdict: "fail",
      },
      feedback: `Reviewer error: ${message}`,
      raw: "",
    };
  } finally {
    try {
      await client.close();
    } catch {
      // Best-effort cleanup.
    }
  }
}

/**
 * Build the prompt for a reviewer. Includes issue metadata + role context.
 * The reviewer's prompt template name is passed as context but not loaded
 * here — that's handled by the caller if using LiquidJS templates.
 */
function buildReviewerPrompt(reviewer: ReviewerDefinition, issue: Issue): string {
  const lines = [
    `You are a code reviewer with the role: ${reviewer.role}.`,
    "",
    `## Issue`,
    `- Identifier: ${issue.identifier}`,
    `- Title: ${issue.title}`,
    ...(issue.description ? [`- Description: ${issue.description}`] : []),
    ...(issue.url ? [`- URL: ${issue.url}`] : []),
    "",
    `## Instructions`,
    `Review the changes for this issue. Respond with TWO sections:`,
    "",
    `1. A JSON verdict line (must be valid JSON on a single line):`,
    "```",
    `{"role": "${reviewer.role}", "model": "${reviewer.model ?? "unknown"}", "verdict": "pass"}`,
    "```",
    `Set verdict to "pass" if the changes look good, or "fail" if there are issues.`,
    "",
    `2. Plain text feedback explaining your assessment.`,
  ];

  if (reviewer.prompt) {
    lines.push("", `## Prompt template: ${reviewer.prompt}`);
  }

  return lines.join("\n");
}

/**
 * Parse reviewer output into verdict JSON + feedback text.
 * Expects the output to contain a JSON line with {role, model, verdict}
 * followed by plain text feedback.
 */
export function parseReviewerOutput(
  reviewer: ReviewerDefinition,
  raw: string,
): ReviewerResult {
  const defaultVerdict: ReviewerVerdict = {
    role: reviewer.role,
    model: reviewer.model ?? "unknown",
    verdict: "fail",
  };

  if (raw.trim().length === 0) {
    return {
      reviewer,
      verdict: defaultVerdict,
      feedback: "Reviewer returned empty output — treating as fail.",
      raw,
    };
  }

  // Try to find a JSON verdict in the output
  const verdictMatch = raw.match(/\{[^}]*"verdict"\s*:\s*"(?:pass|fail)"[^}]*\}/);
  if (verdictMatch === null) {
    return {
      reviewer,
      verdict: defaultVerdict,
      feedback: raw.trim(),
      raw,
    };
  }

  try {
    const parsed = JSON.parse(verdictMatch[0]) as Record<string, unknown>;
    const verdict: ReviewerVerdict = {
      role: typeof parsed.role === "string" ? parsed.role : reviewer.role,
      model:
        typeof parsed.model === "string"
          ? parsed.model
          : reviewer.model ?? "unknown",
      verdict: parsed.verdict === "pass" ? "pass" : "fail",
    };

    // Feedback is everything except the JSON line
    const feedback = raw
      .replace(verdictMatch[0], "")
      .replace(/```/g, "")
      .trim();

    return {
      reviewer,
      verdict,
      feedback: feedback.length > 0 ? feedback : "No additional feedback.",
      raw,
    };
  } catch {
    return {
      reviewer,
      verdict: defaultVerdict,
      feedback: raw.trim(),
      raw,
    };
  }
}

/**
 * Format the aggregate gate result as a markdown comment for Linear.
 */
export function formatGateComment(
  aggregate: AggregateVerdict,
  results: ReviewerResult[],
): string {
  const header =
    aggregate === "pass"
      ? "## Ensemble Review: PASS"
      : "## Ensemble Review: FAIL";

  const sections = results.map((r) => {
    const icon = r.verdict.verdict === "pass" ? "PASS" : "FAIL";
    return [
      `### ${r.verdict.role} (${r.verdict.model}): ${icon}`,
      "",
      r.feedback,
    ].join("\n");
  });

  return [header, "", ...sections].join("\n");
}
