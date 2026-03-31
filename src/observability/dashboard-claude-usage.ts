import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFileCb);

const EXEC_TIMEOUT_MS = 10_000;

/** Runs ops/claude-usage --json and returns parsed output. */
export async function fetchClaudeUsageFromCli(): Promise<
  Record<string, unknown>
> {
  const { stdout } = await execFileAsync("ops/claude-usage", ["--json"], {
    timeout: EXEC_TIMEOUT_MS,
  });
  return JSON.parse(stdout) as Record<string, unknown>;
}
