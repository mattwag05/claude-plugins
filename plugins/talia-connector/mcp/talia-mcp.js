#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// --- Configuration ---

const TRANSPORT = process.env.TRANSPORT || "stdio"; // "stdio" or "sse"
const PORT = parseInt(process.env.PORT || "3847", 10);
const SSH_HOST = process.env.SSH_HOST || "lumes-virtual-machine";
const OPENCLAW_BIN = process.env.OPENCLAW_BIN || "openclaw";
const DEFAULT_TIMEOUT_MS = 30_000;

// When running on the Pi (Docker), use openclaw directly.
// When running on the Mac, SSH to the Pi first.
const LOCAL_MODE = process.env.LOCAL_MODE === "true";

// --- SSH / OpenClaw execution layer ---

function shellEscape(str) {
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

async function runOpenClaw(args, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  try {
    let stdout, stderr;

    if (LOCAL_MODE) {
      // Running locally inside the VM (local to VM)
      // OPENCLAW_BIN may be a .mjs script — run via node
      const bin = OPENCLAW_BIN;
      const isScript = bin.endsWith(".mjs") || bin.endsWith(".js");
      const cmd = isScript ? "node" : bin;
      const cmdArgs = isScript ? [bin, ...args] : args;
      ({ stdout, stderr } = await execFileAsync(
        cmd,
        cmdArgs,
        { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024, env: { ...process.env, HOME: "/root", NO_COLOR: "1" } }
      ));
    } else {
      // SSH to the VM from the Mac
      const command = `NO_COLOR=1 PATH=$HOME/.npm-global/bin:$PATH ${OPENCLAW_BIN} ${args.map(a => shellEscape(a)).join(" ")}`;
      ({ stdout, stderr } = await execFileAsync(
        "ssh",
        ["-o", "ConnectTimeout=10", SSH_HOST, command],
        { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }
      ));
    }

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

// --- ANSI strip (openclaw status uses color codes) ---

function stripAnsi(str) {
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "");
}

// --- MCP Server factory ---
// Each Streamable HTTP session gets a fresh McpServer instance (SDK requirement).
// stdio mode creates one instance and connects it directly.

function createServer() {
  const server = new McpServer({ name: "talia", version: "1.0.0" });

// --- Resources ---

server.resource(
  "status",
  "talia://status",
  { description: "Current OpenClaw gateway status and channel health", mimeType: "text/plain" },
  async () => {
    const result = await runOpenClaw(["status", "--no-color"], { timeoutMs: 15_000 });
    const text = result.ok ? stripAnsi(result.stdout) : `Error: ${result.error}`;
    return { contents: [{ uri: "talia://status", text }] };
  }
);

server.resource(
  "memory",
  "talia://memory",
  { description: "Talia's memory index status", mimeType: "application/json" },
  async () => {
    const result = await runOpenClaw(["memory", "status", "--json"], { timeoutMs: 15_000 });
    const text = result.ok ? result.stdout : JSON.stringify({ error: result.error });
    return { contents: [{ uri: "talia://memory", text }] };
  }
);

// --- Tools ---

server.tool(
  "talia_ask",
  "Send a message to Talia (personal AI assistant on OpenClaw) and get her response. " +
  "Talia has access to memory, tools, SSH, and Telegram. Responses may take up to 10 minutes for complex tasks.",
  {
    message: z.string().describe("The message/prompt to send to Talia"),
    deliver: z.boolean().optional().describe("Also deliver Talia's reply to Telegram (default: false)"),
    thinking: z.enum(["off", "minimal", "low", "medium", "high"]).optional()
      .describe("Thinking level for the agent (default: off)"),
    timeout: z.number().optional()
      .describe("Timeout in seconds (default: 120, max: 600)"),
  },
  async ({ message, deliver, thinking, timeout }) => {
    const agentTimeout = Math.min(timeout || 120, 600);
    const sshTimeout = (agentTimeout * 1000) + 15_000; // agent timeout + SSH overhead

    const args = ["agent", "--agent", "main", "--message", message, "--json", "--timeout", String(agentTimeout)];
    if (deliver) args.push("--deliver");
    if (thinking) args.push("--thinking", thinking);

    const result = await runOpenClaw(args, { timeoutMs: sshTimeout });
    if (!result.ok) return errorResult(result);

    // Try to parse JSON response for cleaner output
    try {
      const data = JSON.parse(result.stdout);
      // Extract reply text from OpenClaw agent response format
      const payloads = data?.result?.payloads;
      const reply = payloads?.[0]?.text || data?.result?.text || data?.text || result.stdout;
      const meta = [];
      const agentMeta = data?.result?.meta?.agentMeta;
      if (agentMeta?.model) meta.push(agentMeta.model);
      if (agentMeta?.usage) {
        const u = agentMeta.usage;
        meta.push(`${(u.total || u.totalTokens || 0).toLocaleString()} tokens`);
      }
      if (data?.result?.meta?.durationMs) {
        meta.push(`${(data.result.meta.durationMs / 1000).toFixed(1)}s`);
      }

      const parts = [{ type: "text", text: typeof reply === "string" ? reply : JSON.stringify(reply, null, 2) }];
      if (meta.length) parts.push({ type: "text", text: `[${meta.join(" | ")}]` });
      return { content: parts };
    } catch {
      // JSON parse failed — return raw output
      return textResult(stripAnsi(result.stdout));
    }
  }
);

server.tool(
  "talia_status",
  "Check OpenClaw gateway status, channel health, and active sessions on the Lume macOS VM.",
  {},
  async () => {
    const result = await runOpenClaw(["status", "--no-color"], { timeoutMs: 15_000 });
    if (!result.ok) return errorResult(result);
    return textResult(stripAnsi(result.stdout));
  }
);

server.tool(
  "talia_memory_search",
  "Search Talia's indexed memory files. Returns matching snippets with relevance scores.",
  {
    query: z.string().describe("Search query"),
  },
  async ({ query }) => {
    const args = ["memory", "search", "--query", query, "--json"];
    const result = await runOpenClaw(args, { timeoutMs: 30_000 });
    if (!result.ok) return errorResult(result);

    try {
      const data = JSON.parse(result.stdout);
      if (Array.isArray(data) && data.length === 0) {
        return textResult("No memory entries found matching that query.");
      }
      return textResult(JSON.stringify(data, null, 2));
    } catch {
      return textResult(stripAnsi(result.stdout));
    }
  }
);

server.tool(
  "talia_sessions",
  "List Talia's active conversation sessions with token usage and model info.",
  {},
  async () => {
    const result = await runOpenClaw(["sessions", "--json"], { timeoutMs: 15_000 });
    if (!result.ok) return errorResult(result);

    try {
      const data = JSON.parse(result.stdout);
      return textResult(JSON.stringify(data, null, 2));
    } catch {
      return textResult(stripAnsi(result.stdout));
    }
  }
);

server.tool(
  "talia_cron_list",
  "List Talia's scheduled cron jobs (heartbeat, reports, etc.) with their status and next run time.",
  {},
  async () => {
    const result = await runOpenClaw(["cron", "list", "--json"], { timeoutMs: 15_000 });
    if (!result.ok) return errorResult(result);

    try {
      const data = JSON.parse(result.stdout);
      return textResult(JSON.stringify(data, null, 2));
    } catch {
      return textResult(stripAnsi(result.stdout));
    }
  }
);

server.tool(
  "talia_cron_run",
  "Manually trigger one of Talia's cron jobs. Use talia_cron_list first to see available jobs.",
  {
    id: z.string().describe("Cron job ID (UUID) or name from talia_cron_list"),
  },
  async ({ id }) => {
    const result = await runOpenClaw(["cron", "run", id], { timeoutMs: 120_000 });
    if (!result.ok) return errorResult(result);
    return textResult(stripAnsi(result.stdout));
  }
);

server.tool(
  "talia_message_send",
  "Send a message via Telegram through OpenClaw channels. Use this to send notifications or messages.",
  {
    message: z.string().describe("Message text to send"),
    target: z.string().describe("Telegram chat ID or @username"),
  },
  async ({ message, target }) => {
    const args = ["message", "send", "--channel", "telegram", "--target", target, "--message", message, "--json"];
    const result = await runOpenClaw(args, { timeoutMs: 30_000 });
    if (!result.ok) return errorResult(result);
    return textResult(result.stdout || "Message sent.");
  }
);

  return server;
} // end createServer()

// --- Transport setup ---

if (TRANSPORT === "sse") {
  const app = createMcpExpressApp({ host: "0.0.0.0" });
  const transports = {};

  // Streamable HTTP — handles GET/POST/DELETE on a single endpoint (matches SDK example pattern)
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
