/**
 * Tests for ops/claude-usage — SYMPH-236
 *
 * Each test spawns the bash script as a subprocess with a shimmed PATH
 * pointing to fake `security` and `curl` binaries in a temp directory.
 * Each test gets its own HOME for sequence.json and cache isolation.
 */

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  chmodSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = join(__dirname, "../../ops/claude-usage");

const SAMPLE_KEYCHAIN_JSON = JSON.stringify({
  claudeAiOauth: {
    accessToken: "sk-ant-oat01-test-token-123",
    refreshToken: "sk-ant-ort01-test-refresh",
  },
});

// Use raw JSON string to preserve float formatting (e.g., 3.0 not 3)
// — the real API returns floats, and JSON.stringify(3.0) emits "3" in JS.
const SAMPLE_API_RESPONSE = `{
  "five_hour": { "utilization": 3.0, "resets_at": "2026-03-31T03:00:00.663100+00:00" },
  "seven_day": { "utilization": 48.0, "resets_at": "2026-04-04T09:59:59.663126+00:00" },
  "seven_day_oauth_apps": null,
  "seven_day_opus": null,
  "seven_day_sonnet": { "utilization": 2.0, "resets_at": "2026-04-04T09:59:59.663135+00:00" },
  "seven_day_cowork": null,
  "iguana_necktie": null,
  "extra_usage": { "is_enabled": false, "monthly_limit": null, "used_credits": null, "utilization": null }
}`;

const SAMPLE_SEQUENCE = {
  activeAccountNumber: 2,
  accounts: {
    "1": { email: "eric@litman.org", organizationName: "Eric Litman" },
    "2": {
      email: "eric@mobilyze.com",
      organizationName: "eric@mobilyze.com's Organization",
    },
  },
};

interface TestContext {
  homeDir: string;
  shimDir: string;
}

function createTestContext(): TestContext {
  const id = randomBytes(6).toString("hex");
  const homeDir = join(tmpdir(), `claude-usage-test-${id}`);
  const shimDir = join(homeDir, "shims");
  mkdirSync(shimDir, { recursive: true });
  return { homeDir, shimDir };
}

function writeShim(dir: string, name: string, script: string) {
  const path = join(dir, name);
  writeFileSync(path, `#!/usr/bin/env bash\n${script}\n`);
  chmodSync(path, 0o755);
}

function writeFakeSecurityShim(
  shimDir: string,
  output: string,
  exitCode = 0,
) {
  if (exitCode === 0) {
    const responseFile = join(shimDir, "security_response.json");
    writeFileSync(responseFile, output);
    writeShim(shimDir, "security", `cat "${responseFile}"`);
  } else {
    writeShim(shimDir, "security", `exit ${exitCode}`);
  }
}

function writeFakeCurlShim(shimDir: string, output: string, exitCode = 0) {
  // Write response to a temp file and cat it, to avoid shell quoting issues
  const responseFile = join(shimDir, "curl_response.json");
  if (exitCode === 0) {
    writeFileSync(responseFile, output);
    writeShim(shimDir, "curl", `cat "${responseFile}"`);
  } else {
    writeShim(shimDir, "curl", `exit ${exitCode}`);
  }
}

function writeSequenceJson(homeDir: string, data: object) {
  const dir = join(homeDir, ".claude-swap-backup");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "sequence.json"), JSON.stringify(data));
}

function runCLI(
  ctx: TestContext,
  args: string[] = [],
  extraEnv: Record<string, string> = {},
) {
  const env: Record<string, string> = {
    HOME: ctx.homeDir,
    PATH: `${ctx.shimDir}:/usr/bin:/bin:/usr/local/bin`,
    ...extraEnv,
  };
  // Remove undefined values
  for (const key of Object.keys(env)) {
    if (env[key] === undefined) delete env[key];
  }
  const result = spawnSync("bash", [SCRIPT_PATH, ...args], {
    env,
    timeout: 30_000,
    encoding: "utf-8",
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.status ?? 1,
  };
}

describe("ops/claude-usage", { timeout: 30_000 }, () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestContext();
  });

  describe("outputs valid JSON", () => {
    it("outputs valid JSON with five_hour and seven_day utilization fields", () => {
      writeFakeSecurityShim(ctx.shimDir, SAMPLE_KEYCHAIN_JSON);
      writeFakeCurlShim(ctx.shimDir, SAMPLE_API_RESPONSE);
      writeSequenceJson(ctx.homeDir, SAMPLE_SEQUENCE);

      const result = runCLI(ctx, ["--json"]);
      expect(result.exitCode).toBe(0);

      const output = JSON.parse(result.stdout);
      expect(output.five_hour).toBeDefined();
      expect(output.five_hour.utilization).toBe(3.0);
      expect(output.seven_day).toBeDefined();
      expect(output.seven_day.utilization).toBe(48.0);
    });
  });

  describe("active_account fields", () => {
    it("active_account contains email and org fields", () => {
      writeFakeSecurityShim(ctx.shimDir, SAMPLE_KEYCHAIN_JSON);
      writeFakeCurlShim(ctx.shimDir, SAMPLE_API_RESPONSE);
      writeSequenceJson(ctx.homeDir, SAMPLE_SEQUENCE);

      const result = runCLI(ctx, ["--json"]);
      expect(result.exitCode).toBe(0);

      const output = JSON.parse(result.stdout);
      expect(output.active_account).toBeDefined();
      expect(output.active_account.email).toBe("eric@mobilyze.com");
      expect(output.active_account.org).toBe(
        "eric@mobilyze.com's Organization",
      );
      expect(output.active_account.account_number).toBe(2);
    });
  });

  describe("lists accounts", () => {
    it("accounts array lists all managed accounts", () => {
      writeFakeSecurityShim(ctx.shimDir, SAMPLE_KEYCHAIN_JSON);
      writeFakeCurlShim(ctx.shimDir, SAMPLE_API_RESPONSE);
      writeSequenceJson(ctx.homeDir, SAMPLE_SEQUENCE);

      const result = runCLI(ctx, ["--json"]);
      expect(result.exitCode).toBe(0);

      const output = JSON.parse(result.stdout);
      expect(output.accounts).toHaveLength(2);
      expect(output.accounts[0].email).toBe("eric@litman.org");
      expect(output.accounts[0].account_number).toBe(1);
      expect(output.accounts[1].email).toBe("eric@mobilyze.com");
      expect(output.accounts[1].account_number).toBe(2);
    });
  });

  describe("writes cache", () => {
    it("writes utilization to per-account cache file", () => {
      writeFakeSecurityShim(ctx.shimDir, SAMPLE_KEYCHAIN_JSON);
      writeFakeCurlShim(ctx.shimDir, SAMPLE_API_RESPONSE);
      writeSequenceJson(ctx.homeDir, SAMPLE_SEQUENCE);

      const result = runCLI(ctx, ["--json"]);
      expect(result.exitCode).toBe(0);

      const cachePath = join(ctx.homeDir, ".symphony", "usage-cache.json");
      expect(existsSync(cachePath)).toBe(true);

      const cache = JSON.parse(readFileSync(cachePath, "utf-8"));
      expect(cache["2"]).toBeDefined();
      expect(cache["2"].five_hour).toBe(3.0);
      expect(cache["2"].seven_day).toBe(48.0);
      expect(cache["2"].timestamp).toBeDefined();
    });
  });

  describe("human-readable", () => {
    it("outputs human-readable summary by default", () => {
      writeFakeSecurityShim(ctx.shimDir, SAMPLE_KEYCHAIN_JSON);
      writeFakeCurlShim(ctx.shimDir, SAMPLE_API_RESPONSE);
      writeSequenceJson(ctx.homeDir, SAMPLE_SEQUENCE);

      const result = runCLI(ctx);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("eric@mobilyze.com");
      expect(result.stdout).toContain("3.0%");
      expect(result.stdout).toContain("48.0%");
    });
  });

  describe("exits non-zero", () => {
    it("exits non-zero when Keychain credentials are unavailable", () => {
      writeFakeSecurityShim(ctx.shimDir, "", 36);
      writeFakeCurlShim(ctx.shimDir, SAMPLE_API_RESPONSE);

      const result = runCLI(ctx, ["--json"]);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("Error");
    });

    it("exits non-zero when security returns empty output", () => {
      writeFakeSecurityShim(ctx.shimDir, "");
      writeFakeCurlShim(ctx.shimDir, SAMPLE_API_RESPONSE);

      const result = runCLI(ctx, ["--json"]);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("Error");
    });
  });

  describe("validates response", () => {
    it("fails gracefully on unexpected API format", () => {
      writeFakeSecurityShim(ctx.shimDir, SAMPLE_KEYCHAIN_JSON);
      writeFakeCurlShim(
        ctx.shimDir,
        JSON.stringify({ unexpected: "format" }),
      );
      writeSequenceJson(ctx.homeDir, SAMPLE_SEQUENCE);

      const result = runCLI(ctx, ["--json"]);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("Unexpected API response format");
    });

    it("fails when five_hour is missing", () => {
      writeFakeSecurityShim(ctx.shimDir, SAMPLE_KEYCHAIN_JSON);
      writeFakeCurlShim(
        ctx.shimDir,
        JSON.stringify({
          seven_day: { utilization: 10.0, resets_at: "2026-04-01T00:00:00+00:00" },
        }),
      );
      writeSequenceJson(ctx.homeDir, SAMPLE_SEQUENCE);

      const result = runCLI(ctx, ["--json"]);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("five_hour");
    });
  });

  describe("missing sequence", () => {
    it("handles missing sequence.json gracefully", () => {
      writeFakeSecurityShim(ctx.shimDir, SAMPLE_KEYCHAIN_JSON);
      writeFakeCurlShim(ctx.shimDir, SAMPLE_API_RESPONSE);
      // Do NOT write sequence.json

      const result = runCLI(ctx, ["--json"]);
      expect(result.exitCode).toBe(0);

      const output = JSON.parse(result.stdout);
      expect(output.accounts).toEqual([]);
      expect(output.active_account).toBeNull();
    });
  });
});
