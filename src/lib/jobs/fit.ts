import type { NormalizedJobPosting } from "./types";

export type FitRecommendation = "strong" | "maybe" | "skip";

export interface FitResult {
  score: number; // 0-100
  recommendation: FitRecommendation;
  hiddenByKeyword: boolean;
  matchedKeywords: string[];
  reasons: string[];
}

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

export function evaluateJobFit(
  posting: Pick<NormalizedJobPosting, "title" | "location">,
  titleKeywords: string[],
  locationKeywords: string[]
): FitResult {
  const title = normalize(posting.title);
  const location = normalize(posting.location || "");

  const cleanTitleKeywords = titleKeywords.map(normalize).filter(Boolean);
  const cleanLocationKeywords = locationKeywords.map(normalize).filter(Boolean);

  const matchedTitle = cleanTitleKeywords.filter((kw) => title.includes(kw));
  const matchedLocation = cleanLocationKeywords.filter((kw) => location.includes(kw));

  let score = 50;
  const reasons: string[] = [];
  const matchedKeywords: string[] = [];

  if (cleanTitleKeywords.length > 0) {
    if (matchedTitle.length > 0) {
      const boost = Math.min(35, 12 + matchedTitle.length * 8);
      score += boost;
      matchedKeywords.push(...matchedTitle.map((kw) => `title:${kw}`));
      reasons.push(`Title matched ${matchedTitle.length} target keyword(s)`);
    } else {
      score -= 25;
      reasons.push("No match against preferred title keywords");
    }
  }

  if (cleanLocationKeywords.length > 0) {
    if (matchedLocation.length > 0) {
      score += 15;
      matchedKeywords.push(...matchedLocation.map((kw) => `location:${kw}`));
      reasons.push("Location matched watch preferences");
    } else {
      score -= 20;
      reasons.push("Location did not match preferred locations");
    }
  }

  // Generic relevance penalties for common mismatch terms
  if (/\b(intern|internship)\b/.test(title)) {
    score -= 35;
    reasons.push("Internship role");
  }
  if (/\b(contract|temporary)\b/.test(title)) {
    score -= 12;
    reasons.push("Contract/temporary signal");
  }

  score = Math.max(0, Math.min(100, score));

  let recommendation: FitRecommendation = "maybe";
  if (score >= 70) recommendation = "strong";
  else if (score < 40) recommendation = "skip";

  const hiddenByKeyword = cleanTitleKeywords.length > 0 && matchedTitle.length === 0;

  return {
    score,
    recommendation,
    hiddenByKeyword,
    matchedKeywords,
    reasons,
  };
}
