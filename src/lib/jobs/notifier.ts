export interface JobAlertMessage {
  company: string;
  title: string;
  url: string;
  location: string;
  sourceType: string;
  matchedKeywords: string[];
}

async function postWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 5000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function sendSlackAlert(message: JobAlertMessage): Promise<boolean> {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return false;

  const keywordText =
    message.matchedKeywords.length > 0
      ? message.matchedKeywords.join(", ")
      : "none";

  const text = [
    `*New role match* at *${message.company}*`,
    `• Title: ${message.title}`,
    `• Location: ${message.location || "N/A"}`,
    `• Source: ${message.sourceType}`,
    `• Matched: ${keywordText}`,
    `• Link: ${message.url}`,
  ].join("\n");

  const res = await postWithTimeout(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  return res.ok;
}

export async function sendEmailDigest(messages: JobAlertMessage[]): Promise<boolean> {
  if (messages.length === 0) return true;

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ALERT_EMAIL_TO;
  const from = process.env.ALERT_EMAIL_FROM || "alerts@next-exit.local";

  if (!apiKey || !to) return false;

  const lines = messages.map((m, i) => {
    const matched = m.matchedKeywords.length > 0 ? m.matchedKeywords.join(", ") : "none";
    return [
      `${i + 1}. ${m.company} - ${m.title}`,
      `   Location: ${m.location || "N/A"}`,
      `   Source: ${m.sourceType}`,
      `   Matched: ${matched}`,
      `   URL: ${m.url}`,
    ].join("\n");
  });

  const text = [
    "Job alert fallback digest (Slack delivery failed):",
    "",
    ...lines,
  ].join("\n");

  const res = await postWithTimeout("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `[Next Exit] ${messages.length} new matched role(s)`,
      text,
    }),
  });

  return res.ok;
}
