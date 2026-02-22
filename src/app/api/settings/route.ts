import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const SETTING_KEYS = ["ai_provider", "anthropic_api_key", "openai_api_key"] as const;

export async function GET() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: [...SETTING_KEYS] } },
  });

  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const anthropicKey = map.anthropic_api_key || "";
  const openaiKey = map.openai_api_key || "";

  return NextResponse.json({
    provider: map.ai_provider || "anthropic",
    hasAnthropicApiKey: anthropicKey.length > 0,
    hasOpenaiApiKey: openaiKey.length > 0,
    anthropicKeyHint: anthropicKey ? `...${anthropicKey.slice(-4)}` : "",
    openaiKeyHint: openaiKey ? `...${openaiKey.slice(-4)}` : "",
  });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { provider, anthropicApiKey, openaiApiKey } = body as {
    provider?: string;
    anthropicApiKey?: string;
    openaiApiKey?: string;
  };

  const upserts: { key: string; value: string }[] = [];

  if (provider !== undefined) {
    if (provider !== "anthropic" && provider !== "openai") {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }
    upserts.push({ key: "ai_provider", value: provider });
  }
  if (anthropicApiKey !== undefined) {
    upserts.push({ key: "anthropic_api_key", value: anthropicApiKey });
  }
  if (openaiApiKey !== undefined) {
    upserts.push({ key: "openai_api_key", value: openaiApiKey });
  }

  for (const { key, value } of upserts) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  return NextResponse.json({ success: true });
}
