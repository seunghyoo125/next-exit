import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchJobsBySource } from "@/lib/jobs/sources";
import { matchPosting } from "@/lib/jobs/matcher";

export const maxDuration = 30;

type SourceType = "greenhouse" | "lever" | "ashby";

function parseStoredArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export async function POST() {
  try {
    // Lightweight diagnostic: sample only the most recent active watch.
    const watch = await prisma.jobWatchlist.findFirst({
      where: { active: true },
      orderBy: { updatedAt: "desc" },
    });

    if (!watch) {
      return NextResponse.json({
        watchesChecked: 0,
        sampledWatch: null,
        jobsFetched: 0,
        matchesFound: 0,
        hiddenByKeyword: 0,
        errors: [],
      });
    }

    const titleKeywords = parseStoredArray(watch.titleKeywords);
    const locationKeywords = parseStoredArray(watch.locationKeywords);
    const postings = await fetchJobsBySource(watch.sourceType as SourceType, watch.sourceId, {
      timeoutMs: 1500,
    });

    const sampled = postings.slice(0, 25);
    let matchesFound = 0;
    let hiddenByKeyword = 0;

    for (const posting of sampled) {
      const m = matchPosting(posting, titleKeywords, locationKeywords);
      if (m.matched) {
        matchesFound += 1;
        if (m.hiddenByKeyword) hiddenByKeyword += 1;
      }
    }

    return NextResponse.json({
      watchesChecked: 1,
      sampledWatch: {
        id: watch.id,
        company: watch.company,
        sourceType: watch.sourceType,
        sourceId: watch.sourceId,
      },
      jobsFetched: sampled.length,
      matchesFound,
      hiddenByKeyword,
      note: "Lightweight preview check. Full ingestion + notifications happen in cron runs.",
      errors: [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        watchesChecked: 1,
        sampledWatch: null,
        jobsFetched: 0,
        matchesFound: 0,
        hiddenByKeyword: 0,
        errors: [error instanceof Error ? error.message : "Check failed"],
      },
      { status: 500 }
    );
  }
}
