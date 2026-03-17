import { describe, expect, it, vi } from "vitest";

import type { CodexClientEvent } from "../../src/codex/app-server-client.js";
import { ClaudeCodeRunner } from "../../src/runners/claude-code-runner.js";

// Mock the AI SDK generateText
vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

vi.mock("ai-sdk-provider-claude-code", () => ({
  claudeCode: vi.fn(() => "mock-claude-model"),
}));

import { generateText } from "ai";
import { claudeCode } from "ai-sdk-provider-claude-code";

const mockGenerateText = vi.mocked(generateText);
const mockClaudeCode = vi.mocked(claudeCode);

describe("ClaudeCodeRunner", () => {
  it("implements AgentRunnerCodexClient interface (startSession, continueTurn, close)", () => {
    const runner = new ClaudeCodeRunner({
      cwd: "/tmp/workspace",
      model: "sonnet",
    });

    expect(typeof runner.startSession).toBe("function");
    expect(typeof runner.continueTurn).toBe("function");
    expect(typeof runner.close).toBe("function");
  });

  it("calls generateText with claude-code model on startSession", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "Hello from Claude",
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        inputTokenDetails: {
          noCacheTokens: undefined,
          cacheReadTokens: undefined,
          cacheWriteTokens: undefined,
        },
        outputTokenDetails: {
          textTokens: undefined,
          reasoningTokens: undefined,
        },
      },
    } as never);

    const runner = new ClaudeCodeRunner({
      cwd: "/tmp/workspace",
      model: "opus",
    });

    const result = await runner.startSession({
      prompt: "Fix the bug",
      title: "ABC-123: Fix the bug",
    });

    expect(mockClaudeCode).toHaveBeenCalledWith("opus", { cwd: "/tmp/workspace" });
    expect(mockGenerateText).toHaveBeenCalledWith({
      model: "mock-claude-model",
      prompt: "Fix the bug",
    });
    expect(result.status).toBe("completed");
    expect(result.message).toBe("Hello from Claude");
    expect(result.usage).toEqual({
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
    });
  });

  it("emits session_started and turn_completed events", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "Done",
      usage: {
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        inputTokenDetails: {
          noCacheTokens: undefined,
          cacheReadTokens: undefined,
          cacheWriteTokens: undefined,
        },
        outputTokenDetails: {
          textTokens: undefined,
          reasoningTokens: undefined,
        },
      },
    } as never);

    const events: CodexClientEvent[] = [];
    const runner = new ClaudeCodeRunner({
      cwd: "/tmp/workspace",
      model: "sonnet",
      onEvent: (event) => events.push(event),
    });

    await runner.startSession({ prompt: "test", title: "test" });

    expect(events).toHaveLength(2);
    expect(events[0]!.event).toBe("session_started");
    expect(events[0]!.codexAppServerPid).toBeNull();
    expect(events[1]!.event).toBe("turn_completed");
    expect(events[1]!.usage).toEqual({
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
    });
  });

  it("emits turn_failed on error and returns failed status", async () => {
    mockGenerateText.mockRejectedValueOnce(
      new Error("Rate limit exceeded"),
    );

    const events: CodexClientEvent[] = [];
    const runner = new ClaudeCodeRunner({
      cwd: "/tmp/workspace",
      model: "sonnet",
      onEvent: (event) => events.push(event),
    });

    const result = await runner.startSession({
      prompt: "test",
      title: "test",
    });

    expect(result.status).toBe("failed");
    expect(result.message).toBe("Rate limit exceeded");
    expect(result.usage).toBeNull();
    expect(events.map((e) => e.event)).toEqual([
      "session_started",
      "turn_failed",
    ]);
  });

  it("increments turn count across startSession and continueTurn", async () => {
    const mockResult = {
      text: "ok",
      usage: {
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        inputTokenDetails: {
          noCacheTokens: undefined,
          cacheReadTokens: undefined,
          cacheWriteTokens: undefined,
        },
        outputTokenDetails: {
          textTokens: undefined,
          reasoningTokens: undefined,
        },
      },
    } as never;
    mockGenerateText
      .mockResolvedValueOnce(mockResult)
      .mockResolvedValueOnce(mockResult);

    const runner = new ClaudeCodeRunner({
      cwd: "/tmp/workspace",
      model: "sonnet",
    });

    const first = await runner.startSession({ prompt: "p1", title: "t" });
    const second = await runner.continueTurn("p2", "t");

    expect(first.turnId).toBe("turn-1");
    expect(second.turnId).toBe("turn-2");
    // Session IDs share the same thread
    expect(first.threadId).toBe(second.threadId);
  });

  it("handles undefined token values from AI SDK gracefully", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "result",
      usage: {
        inputTokens: undefined,
        outputTokens: undefined,
        totalTokens: undefined,
        inputTokenDetails: {
          noCacheTokens: undefined,
          cacheReadTokens: undefined,
          cacheWriteTokens: undefined,
        },
        outputTokenDetails: {
          textTokens: undefined,
          reasoningTokens: undefined,
        },
      },
    } as never);

    const runner = new ClaudeCodeRunner({
      cwd: "/tmp/workspace",
      model: "sonnet",
    });

    const result = await runner.startSession({ prompt: "p", title: "t" });
    expect(result.usage).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    });
  });
});
