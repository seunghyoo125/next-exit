import { NextRequest, NextResponse } from "next/server";
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const watchId = typeof body.watchId === "string" ? body.watchId.trim() : "";

    const watch = watchId
      ? await prisma.jobWatchlist.findUnique({ where: { id: watchId } })
      : await prisma.jobWatchlist.findFirst({
          where: { active: true },
          orderBy: { updatedAt: "desc" },
        });

    if (!watch || !watch.active) {
      return NextResponse.json({
        watchesChecked: 0,
        sampledWatch: null,
        jobsFetched: 0,
        matchesFound: 0,
        alertsCreated: 0,
        alertsNotified: 0,
        hiddenByKeyword: 0,
        mode: "preview",
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
    const samples: Array<{
      title: string;
      location: string;
      matched: boolean;
      hiddenByKeyword: boolean;
      matchedKeywords: string[];
    }> = [];

    for (const posting of sampled) {
      const m = matchPosting(posting, titleKeywords, locationKeywords);
      samples.push({
        title: posting.title,
        location: posting.location,
        matched: m.matched,
        hiddenByKeyword: m.hiddenByKeyword,
        matchedKeywords: m.matchedKeywords,
      });
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
      alertsCreated: 0,
      alertsNotified: 0,
      hiddenByKeyword,
      samples,
      mode: "preview",
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
        alertsCreated: 0,
        alertsNotified: 0,
        hiddenByKeyword: 0,
        mode: "preview",
        errors: [error instanceof Error ? error.message : "Check failed"],
      },
      { status: 500 }
    );
  }
}
