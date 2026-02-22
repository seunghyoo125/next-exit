import { prisma } from "@/lib/db";
import { fetchJobsBySource } from "@/lib/jobs/sources";
import { matchPosting } from "@/lib/jobs/matcher";
import { sendEmailDigest, sendSlackAlert } from "@/lib/jobs/notifier";

type SourceType = "greenhouse" | "lever" | "ashby";

function parseStoredArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export interface JobCheckSummary {
  watchesChecked: number;
  jobsFetched: number;
  matchesFound: number;
  alertsCreated: number;
  alertsNotified: number;
  alertsReposted: number;
  alertsStaled: number;
  timedOut: boolean;
  errors: string[];
}

interface RunJobAlertCheckOptions {
  notify?: boolean;
  maxRuntimeMs?: number;
}

export async function runJobAlertCheck(
  options: RunJobAlertCheckOptions = {}
): Promise<JobCheckSummary> {
  const notify = options.notify ?? true;
  const maxRuntimeMs = options.maxRuntimeMs ?? 30000;
  const startedAt = Date.now();

  const activeWatches = await prisma.jobWatchlist.findMany({
    where: { active: true },
    orderBy: { updatedAt: "desc" },
  });

  const summary: JobCheckSummary = {
    watchesChecked: activeWatches.length,
    jobsFetched: 0,
    matchesFound: 0,
    alertsCreated: 0,
    alertsNotified: 0,
    alertsReposted: 0,
    alertsStaled: 0,
    timedOut: false,
    errors: [],
  };

  const digestQueue: Array<{
    alertId: string;
    company: string;
    title: string;
    url: string;
    location: string;
    sourceType: string;
    matchedKeywords: string[];
  }> = [];

  for (const watch of activeWatches) {
    if (Date.now() - startedAt > maxRuntimeMs) {
      summary.timedOut = true;
      summary.errors.push("Timed out before finishing all watches");
      break;
    }

    try {
      const postings = await fetchJobsBySource(watch.sourceType as SourceType, watch.sourceId);
      summary.jobsFetched += postings.length;

      const now = new Date();
      const titleKeywords = parseStoredArray(watch.titleKeywords);
      const locationKeywords = parseStoredArray(watch.locationKeywords);
      const matchedExternalIds = new Set<string>();

      for (const posting of postings) {
        const match = matchPosting(posting, titleKeywords, locationKeywords);
        if (!match.matched) continue;

        summary.matchesFound += 1;
        matchedExternalIds.add(posting.externalId);

        const existing = await prisma.jobAlert.findUnique({
          where: {
            watchlistId_externalId: {
              watchlistId: watch.id,
              externalId: posting.externalId,
            },
          },
        });

        if (!existing) {
          const created = await prisma.jobAlert.create({
            data: {
              watchlistId: watch.id,
              externalId: posting.externalId,
              company: watch.company,
              title: posting.title,
              url: posting.url,
              location: posting.location,
              postedAt: posting.postedAt,
              sourceUpdatedAt: posting.updatedAt,
              matchedKeywords: JSON.stringify(match.matchedKeywords),
              channel: "slack",
              status: "new",
              firstSeenAt: now,
              lastSeenAt: now,
              seenCount: 1,
              isActive: true,
              repostCount: 0,
            },
          });

          summary.alertsCreated += 1;

          if (match.hiddenByKeyword || !notify) {
            // Keep in dashboard but avoid noisy notifications for low keyword relevance.
            continue;
          }

          const sent = await sendSlackAlert({
            company: watch.company,
            title: posting.title,
            url: posting.url,
            location: posting.location,
            sourceType: watch.sourceType,
            matchedKeywords: match.matchedKeywords,
          });

          if (sent) {
            summary.alertsNotified += 1;
            await prisma.jobAlert.update({
              where: { id: created.id },
              data: { status: "notified", notifiedAt: new Date() },
            });
          } else {
            digestQueue.push({
              alertId: created.id,
              company: watch.company,
              title: posting.title,
              url: posting.url,
              location: posting.location,
              sourceType: watch.sourceType,
              matchedKeywords: match.matchedKeywords,
            });
            await prisma.jobAlert.update({
              where: { id: created.id },
              data: { status: "failed" },
            });
          }

          continue;
        }

        const sourceUpdatedChanged =
          posting.updatedAt &&
          (!existing.sourceUpdatedAt || posting.updatedAt.getTime() > existing.sourceUpdatedAt.getTime());
        const resurfaced = !existing.isActive;
        const reposted = Boolean(sourceUpdatedChanged || resurfaced);

        if (reposted) summary.alertsReposted += 1;

        const updated = await prisma.jobAlert.update({
          where: { id: existing.id },
          data: {
            company: watch.company,
            title: posting.title,
            url: posting.url,
            location: posting.location,
            postedAt: posting.postedAt ?? existing.postedAt,
            sourceUpdatedAt: posting.updatedAt ?? existing.sourceUpdatedAt,
            matchedKeywords: JSON.stringify(match.matchedKeywords),
            lastSeenAt: now,
            seenCount: { increment: 1 },
            isActive: true,
            staleAt: null,
            ...(reposted
              ? {
                  repostCount: { increment: 1 },
                  lastRepostedAt: now,
                  status: "new",
                  notifiedAt: null,
                }
              : {}),
          },
        });

        if (!reposted) continue;
        summary.alertsCreated += 1;

        if (match.hiddenByKeyword || !notify) {
          continue;
        }

        const sent = await sendSlackAlert({
          company: watch.company,
          title: posting.title,
          url: posting.url,
          location: posting.location,
          sourceType: watch.sourceType,
          matchedKeywords: match.matchedKeywords,
        });

        if (sent) {
          summary.alertsNotified += 1;
          await prisma.jobAlert.update({
            where: { id: updated.id },
            data: { status: "notified", notifiedAt: new Date() },
          });
        } else {
          digestQueue.push({
            alertId: updated.id,
            company: watch.company,
            title: posting.title,
            url: posting.url,
            location: posting.location,
            sourceType: watch.sourceType,
            matchedKeywords: match.matchedKeywords,
          });
          await prisma.jobAlert.update({
            where: { id: updated.id },
            data: { status: "failed" },
          });
        }
      }

      const staleWhere =
        matchedExternalIds.size > 0
          ? {
              watchlistId: watch.id,
              isActive: true,
              externalId: { notIn: Array.from(matchedExternalIds) },
            }
          : {
              watchlistId: watch.id,
              isActive: true,
            };

      const staleResult = await prisma.jobAlert.updateMany({
        where: staleWhere,
        data: {
          isActive: false,
          staleAt: now,
        },
      });
      summary.alertsStaled += staleResult.count;

      await prisma.jobWatchlist.update({
        where: { id: watch.id },
        data: { lastCheckedAt: now },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      summary.errors.push(`${watch.company}: ${message}`);
    }
  }

  if (notify && digestQueue.length > 0) {
    try {
      const sent = await sendEmailDigest(
        digestQueue.map((d) => ({
          company: d.company,
          title: d.title,
          url: d.url,
          location: d.location,
          sourceType: d.sourceType,
          matchedKeywords: d.matchedKeywords,
        }))
      );
      if (sent) {
        const notifiedAt = new Date();
        await prisma.jobAlert.updateMany({
          where: {
            id: { in: digestQueue.map((d) => d.alertId) },
          },
          data: {
            status: "notified",
            notifiedAt,
            channel: "email",
          },
        });
        summary.alertsNotified += digestQueue.length;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email digest failed";
      summary.errors.push(message);
    }
  }

  return summary;
}
