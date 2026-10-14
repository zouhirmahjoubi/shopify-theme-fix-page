import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load KIE_API_KEY from a local .env file (KEY=VALUE per line) if it isn't
// already in the environment, so nothing needs to touch shell profiles.
function loadDotEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadDotEnv(join(__dirname, ".env"));

const KIE_API_URL = "https://api.kie.ai/codex/v1/responses";

function extractOutputText(data) {
  if (typeof data.output_text === "string" && data.output_text) return data.output_text;
  if (Array.isArray(data.output)) {
    const parts = [];
    for (const item of data.output) {
      if (item.type === "message" && Array.isArray(item.content)) {
        for (const c of item.content) {
          if (c.type === "output_text" && typeof c.text === "string") parts.push(c.text);
        }
      }
    }
    if (parts.length) return parts.join("\n");
  }
  return null;
}

async function parseResponse(res) {
  const contentType = res.headers.get("content-type") || "";
  const raw = await res.text();

  if (!contentType.includes("text/event-stream")) {
    const data = JSON.parse(raw);
    return { text: extractOutputText(data) ?? JSON.stringify(data), data };
  }

  // Server-sent events: accumulate deltas, prefer the final completed payload.
  let delta = "";
  let finalData = null;
  for (const block of raw.split("\n\n")) {
    const line = block.split("\n").find((l) => l.startsWith("data:"));
    if (!line) continue;
    const jsonStr = line.slice(5).trim();
    if (!jsonStr || jsonStr === "[DONE]") continue;
    let evt;
    try {
      evt = JSON.parse(jsonStr);
    } catch {
      continue;
    }
    if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
      delta += evt.delta;
    } else if (evt.type === "response.completed" && evt.response) {
      finalData = evt.response;
    }
  }
  if (finalData) {
    return { text: extractOutputText(finalData) ?? delta, data: finalData };
  }
  return { text: delta, data: { output_text: delta } };
}

const server = new McpServer({ name: "kie-gpt6-astra", version: "1.0.0" });

server.registerTool(
  "ask_gpt6_astra",
  {
    title: "Ask GPT-6 Astra (via kie.ai)",
    description:
      "Sends a prompt to OpenAI's GPT-6 Astra through the kie.ai API and returns the model's reply.",
    inputSchema: {
      prompt: z.string().describe("The message/prompt to send to GPT-6 Astra."),
      model: z
        .string()
        .optional()
        .describe("kie.ai model id. Defaults to gpt-6-astra. Other GPT tiers share this endpoint."),
      reasoning_effort: z
        .enum(["low", "medium", "high", "xhigh"])
        .optional()
        .describe("Reasoning effort. Defaults to low (fastest/cheapest)."),
      image_url: z.string().optional().describe("Optional image URL to include alongside the prompt."),
      web_search: z.boolean().optional().describe("Enable kie.ai's web_search tool for this call."),
    },
  },
  async ({ prompt, model, reasoning_effort, image_url, web_search }) => {
    const apiKey = process.env.KIE_API_KEY;
    if (!apiKey) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: "KIE_API_KEY is not set. Add it to mcp-kie-gpt6/.env as KIE_API_KEY=your-key and restart.",
          },
        ],
      };
    }

    const content = [{ type: "input_text", text: prompt }];
    if (image_url) content.push({ type: "input_image", image_url });

    const body = {
      model: model || "gpt-6-astra",
      input: [{ role: "user", content }],
      reasoning: { effort: reasoning_effort || "low" },
      stream: false,
    };
    if (web_search) body.tools = [{ type: "web_search" }];

    let res;
    try {
      res = await fetch(KIE_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Request failed: ${err.message}` }] };
    }

    if (!res.ok) {
      const errBody = await res.text();
      return {
        isError: true,
        content: [{ type: "text", text: `kie.ai error ${res.status}: ${errBody}` }],
      };
    }

    const { text } = await parseResponse(res);
    return { content: [{ type: "text", text: text || "(empty response)" }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
