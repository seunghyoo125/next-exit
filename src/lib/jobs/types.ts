export type JobSourceType = "greenhouse" | "lever" | "ashby";

export interface WatchlistInput {
  company: string;
  sourceType: JobSourceType;
  sourceId: string;
  titleKeywords: string[];
  locationKeywords: string[];
  active: boolean;
}

export interface NormalizedJobPosting {
  externalId: string;
  title: string;
  url: string;
  location: string;
  postedAt: Date | null;
  updatedAt: Date | null;
}
