import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { prisma } from "@/lib/db";

interface PromptLogEntry {
  label: string;
  system?: string;
  prompt: string;
  response: string;
  provider: string;
  model: string;
  timestamp: string;
}

const globalForPromptLogs = globalThis as unknown as {
  promptLogs: Map<string, PromptLogEntry> | undefined;
};

const promptLogs = globalForPromptLogs.promptLogs ?? new Map<string, PromptLogEntry>();

if (process.env.NODE_ENV !== "production") globalForPromptLogs.promptLogs = promptLogs;

export function getPromptLog(label: string): PromptLogEntry | null {
  return promptLogs.get(label) ?? null;
}

async function getSettings() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ["ai_provider", "anthropic_api_key", "openai_api_key"] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    provider: (map.ai_provider || "anthropic") as "anthropic" | "openai",
    anthropicApiKey: map.anthropic_api_key || "",
    openaiApiKey: map.openai_api_key || "",
  };
}

export async function callAI(
  prompt: string,
  maxTokens: number = 4096,
  options?: { system?: string; label?: string }
): Promise<string> {
  const settings = await getSettings();
  let responseText: string;
  let model: string;

  if (settings.provider === "openai") {
    if (!settings.openaiApiKey) {
      throw new Error("OpenAI API key not configured. Go to /settings to add it.");
    }
    model = "o3";
    const client = new OpenAI({ apiKey: settings.openaiApiKey });
    const messages: { role: "system" | "user"; content: string }[] = [];
    if (options?.system) {
      messages.push({ role: "system", content: options.system });
    }
    messages.push({ role: "user", content: prompt });
    const response = await client.chat.completions.create({
      model,
      max_completion_tokens: maxTokens,
      messages,
    });
    responseText = response.choices[0]?.message?.content || "";
  } else {
    // Default: Anthropic
    if (!settings.anthropicApiKey) {
      throw new Error("Anthropic API key not configured. Go to /settings to add it.");
    }
    model = "claude-sonnet-4-5-20250929";
    const client = new Anthropic({ apiKey: settings.anthropicApiKey });
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user" as const, content: prompt }],
      ...(options?.system ? { system: options.system } : {}),
    });
    responseText = response.content[0].type === "text" ? response.content[0].text : "";
  }

  // Dev-mode prompt logging
  if (options?.label && process.env.NODE_ENV !== "production") {
    const separator = "=".repeat(80);
    console.log(`\n${separator}`);
    console.log(`[AI CALL] ${options.label} @ ${new Date().toISOString()}`);
    console.log(separator);
    console.log(`Provider: ${settings.provider} | Model: ${model}`);
    console.log(`Prompt length: ${prompt.length} chars | Response length: ${responseText.length} chars`);
    if (options.system) {
      console.log(`System prompt: ${options.system.substring(0, 80)}...`);
    }
    console.log(`--- FULL PROMPT ---`);
    console.log(prompt);
    console.log(`--- END PROMPT ---`);
    console.log(`--- FULL RESPONSE ---`);
    console.log(responseText);
    console.log(`--- END RESPONSE ---`);
    console.log(`${separator}\n`);
  }

  if (options?.label) {
    promptLogs.set(options.label, {
      label: options.label,
      system: options.system,
      prompt,
      response: responseText,
      provider: settings.provider,
      model,
      timestamp: new Date().toISOString(),
    });
  }

  return responseText;
}

export async function parseAIJSON(
  rawText: string,
  schemaHint: string,
  label?: string
): Promise<unknown> {
  const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // One-shot repair: ask the model to fix JSON formatting only
    const repairPrompt = `The following text was intended to be valid JSON matching this schema:
${schemaHint}

Broken text:
${cleaned}

Fix ONLY the JSON formatting (missing quotes, trailing commas, unclosed brackets, etc).
Do NOT change any content, values, or structure.
Return ONLY the repaired valid JSON, nothing else.`;

    const repaired = await callAI(repairPrompt, 4096, {
      label: label ? `${label}-repair` : undefined,
    });
    const repairedStr = repaired.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(repairedStr); // If this also fails, let it throw to the caller's catch
  }
}
