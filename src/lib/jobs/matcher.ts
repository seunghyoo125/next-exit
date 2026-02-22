import type { NormalizedJobPosting } from "./types";

interface MatchResult {
  matched: boolean;
  hiddenByKeyword: boolean;
  matchedKeywords: string[];
}

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

export function matchPosting(
  posting: NormalizedJobPosting,
  titleKeywords: string[],
  locationKeywords: string[]
): MatchResult {
  const normalizedTitle = normalize(posting.title);
  const normalizedLocation = normalize(posting.location);

  const cleanTitleKeywords = titleKeywords.map(normalize).filter(Boolean);
  const cleanLocationKeywords = locationKeywords.map(normalize).filter(Boolean);

  const matchedTitle = cleanTitleKeywords.filter((kw) => normalizedTitle.includes(kw));
  const matchedLocation = cleanLocationKeywords.filter((kw) => normalizedLocation.includes(kw));

  // Soft title filtering:
  // - We still ingest non-matching titles so they can be reviewed in dashboard.
  // - We mark them hiddenByKeyword for UI filtering and alert suppression.
  const hiddenByKeyword = cleanTitleKeywords.length > 0 && matchedTitle.length === 0;
  const locationPass = cleanLocationKeywords.length === 0 || matchedLocation.length > 0;

  return {
    matched: locationPass,
    hiddenByKeyword,
    matchedKeywords: [
      ...matchedTitle.map((kw) => `title:${kw}`),
      ...matchedLocation.map((kw) => `location:${kw}`),
    ],
  };
}
