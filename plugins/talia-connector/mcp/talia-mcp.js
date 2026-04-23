#!/usr/bin/env node

// talia-connector MCP — Hermes-Agent backend (as of Apr 23 2026 cutover)
//
// Decisions applied in this revision:
//   #1 talia_ask  — Hermes OpenAI-compatible API server at http://127.0.0.1:8642
//   #2 talia_memory_search / talia_cron_list / talia_cron_run  — thin shim that
//      shells out to the local `hermes` CLI (no SSH hop since Hermes runs on
//      the M5). NOTE: `hermes memory search` does NOT exist in v0.10.0 — the
//      shim falls back to grepping ~/.hermes/memories/MEMORY.md and USER.md,
//      which covers the 95% case (keyword hits in Talia's flat-memory files).
//   #3 Model — Ollama gemma4:26b (no client-side change; model is selected by
//      the Hermes server).
//
// talia_status / talia_sessions also shim to `hermes` CLI for continuity.
// talia_message_send is deprecated here — use the `hermes` MCP server
// (hermes mcp serve) tool `messages_send` instead.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { execFile } from "child_process";
import { promisify } from "util";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

const execFileAsync = promisify(execFile);

// --- Configuration ---

const TRANSPORT = process.env.TRANSPORT || "stdio"; // "stdio" or "sse"
const PORT = parseInt(process.env.PORT || "3847", 10);
const HERMES_API = process.env.HERMES_API || "http://127.0.0.1:8642";
const HERMES_BIN = process.env.HERMES_BIN || join(homedir(), ".local/bin/hermes");
const HERMES_HOME = process.env.HERMES_HOME || join(homedir(), ".hermes");
const HERMES_MODEL = process.env.HERMES_MODEL || "hermes-agent";
const DEFAULT_TIMEOUT_MS = 30_000;

// --- CLI shim helper ---

async function runHermes(args, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(HERMES_BIN, args, {
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, HERMES_HOME, NO_COLOR: "1" },
    });
    return { ok: true, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (err) {
    if (err.killed) {
      return { ok: false, error: `Timed out after ${timeoutMs}ms`, stderr: err.stderr?.trim() || "" };
    }
    return {
      ok: false,
      error: err.message,
      stdout: err.stdout?.trim() || "",
      stderr: err.stderr?.trim() || "",
      code: err.code,
    };
  }
}

function errorResult(result) {
  const parts = [`Error: ${result.error}`];
  if (result.stderr) parts.push(result.stderr);
  if (result.stdout) parts.push(result.stdout);
  return { content: [{ type: "text", text: parts.join("\n") }], isError: true };
}

function textResult(text) {
  return { content: [{ type: "text", text }] };
}

function stripAnsi(str) {
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "");
}

// --- MCP Server factory ---

function createServer() {
  const server = new McpServer({ name: "talia", version: "2.0.0-hermes" });

  // --- Resources ---

  server.resource(
    "status",
    "talia://status",
    { description: "Hermes gateway status (Telegram + API server)", mimeType: "text/plain" },
    async () => {
      const result = await runHermes(["gateway", "status"], { timeoutMs: 15_000 });
      const text = result.ok ? stripAnsi(result.stdout) : `Error: ${result.error}`;
      return { contents: [{ uri: "talia://status", text }] };
    }
  );

  // --- Tools ---

  // talia_ask — Decision #1: POST to Hermes OpenAI-compatible API server
  server.tool(
    "talia_ask",
    "Send a message to Talia (personal AI assistant, Hermes-backed) and get her response. " +
    "Talia has access to memory, tools, and Telegram. Requests go to the local Hermes API server (no SSH).",
    {
      message: z.string().describe("The message/prompt to send to Talia"),
      deliver: z.boolean().optional().describe("(deprecated — no-op on Hermes API path)"),
      thinking: z.enum(["off", "minimal", "low", "medium", "high"]).optional()
        .describe("(deprecated — no-op on Hermes API path)"),
      timeout: z.number().optional()
        .describe("Timeout in seconds (default: 120, max: 600)"),
    },
    async ({ message, timeout }) => {
      const timeoutSec = Math.min(timeout || 120, 600);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutSec * 1000);
      try {
        const res = await fetch(`${HERMES_API}/v1/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: HERMES_MODEL,
            messages: [{ role: "user", content: message }],
            max_tokens: 2048,
          }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          return errorResult({ error: `HTTP ${res.status} from ${HERMES_API}/v1/chat/completions`, stderr: body });
        }
        const data = await res.json();
        const reply = data?.choices?.[0]?.message?.content;
        const usage = data?.usage;
        const parts = [{ type: "text", text: typeof reply === "string" ? reply : JSON.stringify(data, null, 2) }];
        if (usage) {
          parts.push({ type: "text", text: `[${data.model || HERMES_MODEL} | ${usage.total_tokens || 0} tokens]` });
        }
        return { content: parts };
      } catch (err) {
        if (err.name === "AbortError") {
          return errorResult({ error: `Timed out after ${timeoutSec}s` });
        }
        return errorResult({ error: err.message });
      } finally {
        clearTimeout(timer);
      }
    }
  );

  // talia_status — shim to `hermes gateway status`
  server.tool(
    "talia_status",
    "Check Hermes gateway status (Telegram + API server health).",
    {},
    async () => {
      const result = await runHermes(["gateway", "status"], { timeoutMs: 15_000 });
      if (!result.ok) return errorResult(result);
      return textResult(stripAnsi(result.stdout));
    }
  );

  // talia_memory_search — Decision #2 shim.
  // `hermes memory search` does NOT exist in v0.10.0. Hermes uses FTS5 inside
  // state.db internally, but no CLI surface. We grep the flat memory files
  // which is what the agent itself reads every turn.
  server.tool(
    "talia_memory_search",
    "Search Talia's indexed memory files (MEMORY.md + USER.md). Returns matching lines with context.",
    {
      query: z.string().describe("Search query (keyword or phrase, case-insensitive)"),
    },
    async ({ query }) => {
      const files = [
        join(HERMES_HOME, "memories", "MEMORY.md"),
        join(HERMES_HOME, "memories", "USER.md"),
      ];
      const needle = query.toLowerCase();
      const hits = [];
      for (const path of files) {
        try {
          const content = await readFile(path, "utf8");
          const lines = content.split("\n");
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(needle)) {
              const pre = lines.slice(Math.max(0, i - 1), i).join("\n");
              const post = lines.slice(i + 1, Math.min(lines.length, i + 2)).join("\n");
              hits.push({
                file: path.replace(HERMES_HOME, "~/.hermes"),
                line: i + 1,
                context: [pre, lines[i], post].filter(Boolean).join("\n"),
              });
            }
          }
        } catch (err) {
          // file missing is fine; surface other errors
          if (err.code !== "ENOENT") {
            return errorResult({ error: `Reading ${path}: ${err.message}` });
          }
        }
      }
      if (hits.length === 0) {
        return textResult(`No memory entries matched "${query}".`);
      }
      return textResult(JSON.stringify(hits.slice(0, 40), null, 2));
    }
  );

  // talia_sessions — shim to `hermes sessions list`
  server.tool(
    "talia_sessions",
    "List Talia's recent conversation sessions (via `hermes sessions list`).",
    {
      limit: z.number().optional().describe("Max rows (default: 20)"),
    },
    async ({ limit }) => {
      const args = ["sessions", "list"];
      if (limit) args.push("--limit", String(limit));
      const result = await runHermes(args, { timeoutMs: 15_000 });
      if (!result.ok) return errorResult(result);
      return textResult(stripAnsi(result.stdout));
    }
  );

  // talia_cron_list — Decision #2 shim to `hermes cron list`
  server.tool(
    "talia_cron_list",
    "List Talia's scheduled cron jobs and their next run times (via `hermes cron list`).",
    {},
    async () => {
      const result = await runHermes(["cron", "list"], { timeoutMs: 15_000 });
      if (!result.ok) return errorResult(result);
      return textResult(stripAnsi(result.stdout));
    }
  );

  // talia_cron_run — Decision #2 shim to `hermes cron run <id>`
  server.tool(
    "talia_cron_run",
    "Manually trigger one of Talia's cron jobs (via `hermes cron run <id>`). Use talia_cron_list first.",
    {
      id: z.string().describe("Cron job ID or name from talia_cron_list"),
    },
    async ({ id }) => {
      const result = await runHermes(["cron", "run", id], { timeoutMs: 120_000 });
      if (!result.ok) return errorResult(result);
      return textResult(stripAnsi(result.stdout));
    }
  );

  // talia_message_send — deprecated on this connector.
  // The canonical path is the `hermes` MCP server (`hermes mcp serve`)
  // tool `messages_send`. Keeping a stub so existing callers get a helpful
  // error instead of a crash.
  server.tool(
    "talia_message_send",
    "[DEPRECATED in v2.0.0-hermes] Send a Telegram message. Use the `hermes` MCP server's `messages_send` tool instead — register it in ~/.claude.json.",
    {
      message: z.string(),
      target: z.string(),
    },
    async () => {
      return errorResult({
        error: "talia_message_send is deprecated on the Hermes backend. " +
          "Register the `hermes` MCP server (command: hermes mcp serve) and use its `messages_send` tool instead.",
      });
    }
  );

  return server;
}

// --- Transport setup ---

if (TRANSPORT === "sse") {
  const app = createMcpExpressApp({ host: "0.0.0.0" });
  const transports = {};

  app.all("/mcp", async (req, res) => {
    try {
      const sessionId = req.headers["mcp-session-id"];
      let transport;

      if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
      } else if (!sessionId && req.method === "POST" && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            transports[sid] = transport;
            console.error(`Session initialized: ${sid}`);
          },
        });
        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports[sid]) {
            delete transports[sid];
            console.error(`Session closed: ${sid}`);
          }
        };
        await createServer().connect(transport);
      } else {
        res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Bad Request: missing or invalid session" }, id: null });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error("MCP handler error:", err);
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
      }
    }
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", transport: "streamable-http", sessions: Object.keys(transports).length });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.error(`Talia MCP server listening on http://0.0.0.0:${PORT}/mcp`);
  });

  const shutdown = async () => {
    for (const id in transports) {
      await transports[id].close().catch(() => {});
    }
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
} else {
  // stdio transport (default — for local Mac usage)
  await createServer().connect(new StdioServerTransport());
}
