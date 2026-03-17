import { generateText } from "ai";
import { claudeCode } from "ai-sdk-provider-claude-code";

import type { CodexClientEvent, CodexTurnResult } from "../codex/app-server-client.js";
import type { AgentRunnerCodexClient } from "../agent/runner.js";

export interface ClaudeCodeRunnerOptions {
  cwd: string;
  model: string;
  onEvent?: (event: CodexClientEvent) => void;
}

export class ClaudeCodeRunner implements AgentRunnerCodexClient {
  private readonly options: ClaudeCodeRunnerOptions;
  private sessionId: string;
  private turnCount = 0;
  private closed = false;

  constructor(options: ClaudeCodeRunnerOptions) {
    this.options = options;
    this.sessionId = `claude-${Date.now()}`;
  }

  async startSession(input: {
    prompt: string;
    title: string;
  }): Promise<CodexTurnResult> {
    return this.executeTurn(input.prompt, input.title);
  }

  async continueTurn(
    prompt: string,
    title: string,
  ): Promise<CodexTurnResult> {
    return this.executeTurn(prompt, title);
  }

  async close(): Promise<void> {
    this.closed = true;
  }

  private async executeTurn(
    prompt: string,
    _title: string,
  ): Promise<CodexTurnResult> {
    this.turnCount += 1;
    const turnId = `turn-${this.turnCount}`;
    const threadId = this.sessionId;
    const fullSessionId = `${threadId}-${turnId}`;

    this.emit({
      event: "session_started",
      sessionId: fullSessionId,
      threadId,
      turnId,
    });

    try {
      const result = await generateText({
        model: claudeCode(this.options.model, {
          cwd: this.options.cwd,
        }),
        prompt,
      });

      const usage = {
        inputTokens: result.usage.inputTokens ?? 0,
        outputTokens: result.usage.outputTokens ?? 0,
        totalTokens: result.usage.totalTokens ?? 0,
      };

      this.emit({
        event: "turn_completed",
        sessionId: fullSessionId,
        threadId,
        turnId,
        usage,
        message: result.text,
      });

      return {
        status: "completed",
        threadId,
        turnId,
        sessionId: fullSessionId,
        usage,
        rateLimits: null,
        message: result.text,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Claude Code turn failed";

      this.emit({
        event: "turn_failed",
        sessionId: fullSessionId,
        threadId,
        turnId,
        message,
      });

      return {
        status: "failed",
        threadId,
        turnId,
        sessionId: fullSessionId,
        usage: null,
        rateLimits: null,
        message,
      };
    }
  }

  private emit(
    input: Omit<CodexClientEvent, "timestamp" | "codexAppServerPid">,
  ): void {
    this.options.onEvent?.({
      ...input,
      timestamp: new Date().toISOString(),
      codexAppServerPid: null,
    });
  }
}
