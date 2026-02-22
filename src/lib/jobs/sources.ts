import type { JobSourceType, NormalizedJobPosting } from "./types";

function asDate(value: unknown): Date | null {
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

async function fetchGreenhouse(sourceId: string): Promise<NormalizedJobPosting[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(sourceId)}/jobs`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Greenhouse fetch failed (${res.status})`);
  }
  const data = (await res.json()) as { jobs?: Array<Record<string, unknown>> };
  const jobs = Array.isArray(data.jobs) ? data.jobs : [];

  const mapped = jobs.map((job): NormalizedJobPosting | null => {
      const id = job.id;
      const title = job.title;
      const absoluteUrl = job.absolute_url;
      const locationObj = job.location as { name?: string } | undefined;
      const updatedAt = job.updated_at;

      if (typeof id !== "number" || typeof title !== "string" || typeof absoluteUrl !== "string") {
        return null;
      }

      return {
        externalId: String(id),
        title: title.trim(),
        url: absoluteUrl,
        location: (locationObj?.name || "").trim(),
        postedAt: null,
        updatedAt: asDate(updatedAt),
      } satisfies NormalizedJobPosting;
    });

  return mapped.filter((j): j is NormalizedJobPosting => j !== null);
}

async function fetchLever(sourceId: string): Promise<NormalizedJobPosting[]> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(sourceId)}?mode=json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Lever fetch failed (${res.status})`);
  }
  const data = (await res.json()) as Array<Record<string, unknown>>;
  const jobs = Array.isArray(data) ? data : [];

  const mapped = jobs.map((job): NormalizedJobPosting | null => {
      const id = job.id;
      const text = job.text;
      const hostedUrl = job.hostedUrl;
      const categories = job.categories as { location?: string } | undefined;
      const createdAt = job.createdAt;
      const updatedAt = job.updatedAt;

      if (typeof id !== "string" || typeof text !== "string" || typeof hostedUrl !== "string") {
        return null;
      }

      return {
        externalId: id,
        title: text.trim(),
        url: hostedUrl,
        location: (categories?.location || "").trim(),
        postedAt: asDate(createdAt),
        updatedAt: asDate(updatedAt),
      } satisfies NormalizedJobPosting;
    });

  return mapped.filter((j): j is NormalizedJobPosting => j !== null);
}

async function fetchAshby(sourceId: string): Promise<NormalizedJobPosting[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(sourceId)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Ashby fetch failed (${res.status})`);
  }
  const data = (await res.json()) as { jobs?: Array<Record<string, unknown>> };
  const jobs = Array.isArray(data.jobs) ? data.jobs : [];

  const mapped = jobs.map((job): NormalizedJobPosting | null => {
      const id = (job.id ?? job._id) as unknown;
      const title = job.title;
      const jobUrl = (job.jobUrl ?? job.applyUrl ?? job.url) as unknown;
      const locationObj = job.location as { name?: string } | undefined;
      const publishedAt = (job.publishedAt ?? job.createdAt) as unknown;
      const updatedAt = (job.updatedAt ?? job.publishedAt ?? job.createdAt) as unknown;

      if (typeof title !== "string") return null;

      const externalId = typeof id === "string" ? id : title;
      const resolvedUrl =
        typeof jobUrl === "string" && jobUrl
          ? jobUrl
          : typeof id === "string"
            ? `https://jobs.ashbyhq.com/${sourceId}/${id}`
            : `https://jobs.ashbyhq.com/${sourceId}`;

      return {
        externalId,
        title: title.trim(),
        url: resolvedUrl,
        location: (locationObj?.name || "").trim(),
        postedAt: asDate(publishedAt),
        updatedAt: asDate(updatedAt),
      } satisfies NormalizedJobPosting;
    });

  return mapped.filter((j): j is NormalizedJobPosting => j !== null);
}

export async function fetchJobsBySource(
  sourceType: JobSourceType,
  sourceId: string
): Promise<NormalizedJobPosting[]> {
  if (sourceType === "greenhouse") return fetchGreenhouse(sourceId);
  if (sourceType === "lever") return fetchLever(sourceId);
  if (sourceType === "ashby") return fetchAshby(sourceId);
  throw new Error(`Unsupported source type: ${sourceType}`);
}
