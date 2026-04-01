/**
 * Pipeline notification module.
 *
 * Best-effort Slack notifications for high-value pipeline events.
 * Failures are logged and swallowed — never affect pipeline correctness.
 */

import type { ExecutionHistory } from "../domain/model.js";
import { getDisplayVersion } from "../version.js";

// ---------------------------------------------------------------------------
// Event types (discriminated union)
// ---------------------------------------------------------------------------

export interface PipelineStartedEvent {
  type: "pipeline_started";
  productName: string;
  dashboardUrl: string | null;
}

export interface PipelineStoppedEvent {
  type: "pipeline_stopped";
  productName: string;
  completedCount: number;
  failedCount: number;
  durationMs: number;
}

export interface IssueCompletedEvent {
  type: "issue_completed";
  issueIdentifier: string;
  issueTitle: string;
  issueUrl: string | null;
  executionHistory: ExecutionHistory;
  reworkCount: number;
  totalTokens: number;
  totalDurationMs: number;
}

export interface IssueFailedEvent {
  type: "issue_failed";
  issueIdentifier: string;
  issueTitle: string;
  issueUrl: string | null;
  failureReason: string | null;
  retriesExhausted: boolean;
  retryAttempt: number | null;
}

export interface StallKilledEvent {
  type: "stall_killed";
  issueIdentifier: string;
  issueTitle: string;
  stageName: string | null;
  stallDurationMs: number;
}

export interface InfraErrorEvent {
  type: "infra_error";
  issueIdentifier: string;
  issueTitle: string;
  errorReason: string;
}

export interface IssueDispatchedEvent {
  type: "issue_dispatched";
  issueIdentifier: string;
  issueTitle: string;
  issueUrl: string | null;
  stageName: string | null;
  reworkCount: number;
}

export interface IssueDroppedEvent {
  type: "issue_dropped";
  issueIdentifier: string;
  issueTitle: string;
  issueUrl: string | null;
  reason: string;
}

export type PipelineNotificationEvent =
  | PipelineStartedEvent
  | PipelineStoppedEvent
  | IssueCompletedEvent
  | IssueFailedEvent
  | StallKilledEvent
  | InfraErrorEvent
  | IssueDispatchedEvent
  | IssueDroppedEvent;

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function formatDurationMs(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export function formatStageTimeline(history: ExecutionHistory): string {
  if (history.length === 0) {
    return "_No stage data_";
  }

  return history
    .map(
      (record) =>
        `${record.stageName}: ${formatDurationMs(record.durationMs)} · ${record.totalTokens.toLocaleString("en-US")} tokens · ${record.outcome}`,
    )
    .join("\n");
}

// ---------------------------------------------------------------------------
// Message formatter
// ---------------------------------------------------------------------------

export function formatNotification(event: PipelineNotificationEvent): string {
  const version = `_symphony-ts v${getDisplayVersion()}_`;

  switch (event.type) {
    case "pipeline_started": {
      const parts = [`:rocket: *Pipeline started* — ${event.productName}`];
      if (event.dashboardUrl !== null) {
        parts.push(`Dashboard: ${event.dashboardUrl}`);
      }
      parts.push(version);
      return parts.join("\n");
    }

    case "pipeline_stopped": {
      const total = event.completedCount + event.failedCount;
      return [
        `:stop_sign: *Pipeline stopped* — ${event.productName}`,
        `Completed: ${event.completedCount} · Failed: ${event.failedCount} · Total: ${total}`,
        `Duration: ${formatDurationMs(event.durationMs)}`,
        version,
      ].join("\n");
    }

    case "issue_completed": {
      const parts = [
        `:white_check_mark: *Issue completed* — ${event.issueIdentifier}`,
        `*${event.issueTitle}*`,
      ];
      if (event.issueUrl !== null) {
        parts.push(event.issueUrl);
      }
      if (event.executionHistory.length > 0) {
        parts.push("", formatStageTimeline(event.executionHistory));
      }
      parts.push(
        "",
        `Total: ${formatDurationMs(event.totalDurationMs)} · ${event.totalTokens.toLocaleString("en-US")} tokens`,
      );
      if (event.reworkCount > 0) {
        parts.push(`Rework cycles: ${event.reworkCount}`);
      }
      parts.push(version);
      return parts.join("\n");
    }

    case "issue_failed": {
      const parts = [
        `:x: *Issue failed* — ${event.issueIdentifier}`,
        `*${event.issueTitle}*`,
      ];
      if (event.issueUrl !== null) {
        parts.push(event.issueUrl);
      }
      if (event.failureReason !== null) {
        parts.push(`Reason: ${event.failureReason}`);
      }
      if (event.retriesExhausted) {
        parts.push(`Retries exhausted (attempt ${event.retryAttempt ?? "?"})`);
      }
      parts.push(version);
      return parts.join("\n");
    }

    case "stall_killed": {
      const parts = [
        `:warning: *Stall killed* — ${event.issueIdentifier}`,
        `*${event.issueTitle}*`,
      ];
      if (event.stageName !== null) {
        parts.push(`Stage: ${event.stageName}`);
      }
      parts.push(`Stalled for: ${formatDurationMs(event.stallDurationMs)}`);
      parts.push(version);
      return parts.join("\n");
    }

    case "infra_error": {
      return [
        `:rotating_light: *Infra error* — ${event.issueIdentifier}`,
        `*${event.issueTitle}*`,
        `Error: ${event.errorReason}`,
        version,
      ].join("\n");
    }

    case "issue_dispatched": {
      const parts = [
        `:arrow_forward: *Issue dispatched* — ${event.issueIdentifier}`,
        `*${event.issueTitle}*`,
      ];
      if (event.issueUrl !== null) {
        parts.push(event.issueUrl);
      }
      if (event.stageName !== null) {
        parts.push(`Stage: ${event.stageName}`);
      }
      if (event.reworkCount > 0) {
        parts.push(`Rework #${event.reworkCount}`);
      }
      parts.push(version);
      return parts.join("\n");
    }

    case "issue_dropped": {
      const parts = [
        `:stop_button: *Issue left pipeline* — ${event.issueIdentifier}`,
        `*${event.issueTitle}*`,
      ];
      if (event.issueUrl !== null) {
        parts.push(event.issueUrl);
      }
      parts.push(`Reason: ${event.reason}`);
      parts.push(version);
      return parts.join("\n");
    }
  }
}

// ---------------------------------------------------------------------------
// Poster interface & Slack factory
// ---------------------------------------------------------------------------

export interface NotificationPoster {
  post(channel: string, text: string): Promise<void>;
}

export function createSlackPoster(input: {
  botToken: string;
}): NotificationPoster {
  // Lazy-import to avoid pulling @slack/web-api into test bundles
  // when using mock posters.
  let clientPromise: Promise<import("@slack/web-api").WebClient> | null = null;

  const getClient = () => {
    if (clientPromise === null) {
      clientPromise = import("@slack/web-api").then(
        ({ WebClient }) => new WebClient(input.botToken),
      );
    }
    return clientPromise;
  };

  return {
    async post(channel: string, text: string): Promise<void> {
      const client = await getClient();
      await client.chat.postMessage({ channel, text });
    },
  };
}

// ---------------------------------------------------------------------------
// PipelineNotifier — best-effort delivery
// ---------------------------------------------------------------------------

export interface PipelineNotificationSink {
  notify(event: PipelineNotificationEvent): void;
  flush?(): Promise<void>;
}

export interface PipelineNotifierOptions {
  channel: string;
  poster: NotificationPoster;
  onError?: (error: unknown) => void;
}

export class PipelineNotifier implements PipelineNotificationSink {
  private readonly channel: string;
  private readonly poster: NotificationPoster;
  private readonly onError: (error: unknown) => void;
  private readonly inflight: Set<Promise<void>> = new Set();

  constructor(options: PipelineNotifierOptions) {
    this.channel = options.channel;
    this.poster = options.poster;
    this.onError = options.onError ?? (() => {});
  }

  notify(event: PipelineNotificationEvent): void {
    const text = formatNotification(event);
    const p = this.poster.post(this.channel, text).catch((error) => {
      this.onError(error);
    });
    this.inflight.add(p);
    void p.finally(() => this.inflight.delete(p));
  }

  async flush(timeoutMs = 5000): Promise<void> {
    if (this.inflight.size === 0) return;
    await Promise.race([
      Promise.allSettled(this.inflight),
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  }
}
