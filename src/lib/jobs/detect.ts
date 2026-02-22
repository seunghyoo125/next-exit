import type { JobSourceType } from "./types";

export interface SourceDetectionResult {
  sourceType: JobSourceType;
  sourceId: string;
  confidence: "high" | "medium";
  reason: string;
}

function uniqueByKey(items: SourceDetectionResult[]): SourceDetectionResult[] {
  const seen = new Set<string>();
  const out: SourceDetectionResult[] = [];
  for (const item of items) {
    const key = `${item.sourceType}:${item.sourceId}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function detectFromString(raw: string): SourceDetectionResult[] {
  const results: SourceDetectionResult[] = [];

  const ashbyHostMatches = [...raw.matchAll(/jobs\.ashbyhq\.com\/([a-zA-Z0-9_-]+)/g)];
  for (const m of ashbyHostMatches) {
    if (m[1]) {
      results.push({
        sourceType: "ashby",
        sourceId: m[1],
        confidence: "high",
        reason: "Found Ashby hosted job URL pattern",
      });
    }
  }

  const greenhouseBoardMatches = [...raw.matchAll(/boards\.greenhouse\.io\/([a-zA-Z0-9_-]+)/g)];
  for (const m of greenhouseBoardMatches) {
    if (m[1]) {
      results.push({
        sourceType: "greenhouse",
        sourceId: m[1],
        confidence: "high",
        reason: "Found Greenhouse board URL pattern",
      });
    }
  }

  const leverMatches = [...raw.matchAll(/jobs\.lever\.co\/([a-zA-Z0-9_-]+)/g)];
  for (const m of leverMatches) {
    if (m[1]) {
      results.push({
        sourceType: "lever",
        sourceId: m[1],
        confidence: "high",
        reason: "Found Lever jobs URL pattern",
      });
    }
  }

  const boardParamMatches = [...raw.matchAll(/[?&]board=([a-zA-Z0-9_-]+)/g)];
  for (const m of boardParamMatches) {
    if (m[1]) {
      results.push({
        sourceType: "greenhouse",
        sourceId: m[1],
        confidence: "medium",
        reason: "Found board query parameter",
      });
    }
  }

  const ashbyJidMatches = [...raw.matchAll(/[?&]ashby_jid=([a-zA-Z0-9-]+)/g)];
  if (ashbyJidMatches.length > 0) {
    const hostMatch = raw.match(/https?:\/\/(?:www\.)?([a-zA-Z0-9-]+)\./);
    if (hostMatch?.[1]) {
      results.push({
        sourceType: "ashby",
        sourceId: hostMatch[1],
        confidence: "medium",
        reason: "Found ashby_jid parameter and inferred slug from host",
      });
    }
  }

  return uniqueByKey(results);
}

export async function detectSourceFromUrl(url: string): Promise<SourceDetectionResult[]> {
  const results: SourceDetectionResult[] = [];
  const direct = detectFromString(url);
  results.push(...direct);

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const html = await res.text();
      results.push(...detectFromString(html));
    }
  } catch {
    // Ignore fetch failures; direct URL detection might still be enough.
  }

  const deduped = uniqueByKey(results);
  deduped.sort((a, b) => {
    if (a.confidence === b.confidence) return 0;
    return a.confidence === "high" ? -1 : 1;
  });

  return deduped;
}
