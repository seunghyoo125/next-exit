import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { evaluateJobFit } from "@/lib/jobs/fit";

function parseStoredArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam) || 50, 1), 200);
  const includeHidden = request.nextUrl.searchParams.get("includeHidden") === "true";
  const view = request.nextUrl.searchParams.get("view") || "all";
  const q = (request.nextUrl.searchParams.get("q") || "").trim().toLowerCase();

  const alerts = await prisma.jobAlert.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      watchlist: {
        select: {
          id: true,
          company: true,
          sourceType: true,
          sourceId: true,
          titleKeywords: true,
          locationKeywords: true,
        },
      },
    },
  });

  const enriched = alerts.map((a) => {
    const titleKeywords = parseStoredArray(a.watchlist.titleKeywords);
    const locationKeywords = parseStoredArray(a.watchlist.locationKeywords);
    const fit = evaluateJobFit(
      { title: a.title, location: a.location },
      titleKeywords,
      locationKeywords
    );

    return {
      id: a.id,
      watchlistId: a.watchlistId,
      externalId: a.externalId,
      company: a.company,
      title: a.title,
      url: a.url,
      location: a.location,
      postedAt: a.postedAt,
      sourceUpdatedAt: a.sourceUpdatedAt,
      matchedKeywords: parseStoredArray(a.matchedKeywords),
      channel: a.channel,
      status: a.status,
      userDecision: a.userDecision,
      decisionNote: a.decisionNote,
      decidedAt: a.decidedAt,
      firstSeenAt: a.firstSeenAt,
      lastSeenAt: a.lastSeenAt,
      seenCount: a.seenCount,
      isActive: a.isActive,
      staleAt: a.staleAt,
      repostCount: a.repostCount,
      lastRepostedAt: a.lastRepostedAt,
      notifiedAt: a.notifiedAt,
      createdAt: a.createdAt,
      fit,
      watchlist: a.watchlist,
    };
  });

  const filtered = enriched.filter((a) => {
    if (!includeHidden && a.fit.hiddenByKeyword) return false;

    if (view === "new" && a.status === "notified") return false;
    if (view === "reposted" && a.repostCount < 1) return false;
    if (view === "stale" && a.isActive) return false;
    if (view === "applied" && a.userDecision !== "applied") return false;
    if (view === "skip" && a.userDecision !== "skip") return false;
    if (view === "strong" && a.fit.recommendation !== "strong") return false;
    if (view === "maybe" && a.fit.recommendation !== "maybe") return false;
    if (view === "fit-skip" && a.fit.recommendation !== "skip") return false;

    if (q) {
      const haystack = `${a.company} ${a.title} ${a.location}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });

  const counts = {
    total: enriched.length,
    hidden: enriched.filter((a) => a.fit.hiddenByKeyword).length,
    strong: enriched.filter((a) => a.fit.recommendation === "strong").length,
    maybe: enriched.filter((a) => a.fit.recommendation === "maybe").length,
    fitSkip: enriched.filter((a) => a.fit.recommendation === "skip").length,
    reposted: enriched.filter((a) => a.repostCount > 0).length,
    active: enriched.filter((a) => a.isActive).length,
    stale: enriched.filter((a) => !a.isActive).length,
    applied: enriched.filter((a) => a.userDecision === "applied").length,
    skipped: enriched.filter((a) => a.userDecision === "skip").length,
  };

  return NextResponse.json({ alerts: filtered, counts });
}
