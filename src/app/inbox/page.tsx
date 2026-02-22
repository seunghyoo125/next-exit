"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface AlertItem {
  id: string;
  company: string;
  title: string;
  url: string;
  location: string;
  postedAt: string | null;
  sourceUpdatedAt: string | null;
  status: string;
  userDecision: "" | "applied" | "skip";
  decisionNote: string;
  decidedAt: string | null;
  createdAt: string;
  firstSeenAt: string;
  lastSeenAt: string;
  seenCount: number;
  isActive: boolean;
  staleAt: string | null;
  repostCount: number;
  lastRepostedAt: string | null;
  notifiedAt: string | null;
  matchedKeywords: string[];
  fit: {
    score: number;
    recommendation: "strong" | "maybe" | "skip";
    hiddenByKeyword: boolean;
    matchedKeywords: string[];
    reasons: string[];
  };
}

interface AlertCounts {
  total: number;
  hidden: number;
  strong: number;
  maybe: number;
  fitSkip: number;
  reposted: number;
  active: number;
  stale: number;
  applied: number;
  skipped: number;
}

type ViewMode =
  | "all"
  | "strong"
  | "maybe"
  | "fit-skip"
  | "reposted"
  | "stale"
  | "applied"
  | "skip";

type GroupMode = "company" | "role";

function recommendationVariant(rec: "strong" | "maybe" | "skip"): "default" | "secondary" | "destructive" {
  if (rec === "strong") return "default";
  if (rec === "maybe") return "secondary";
  return "destructive";
}

export default function InboxPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [counts, setCounts] = useState<AlertCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("all");
  const [includeHidden, setIncludeHidden] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupMode>("company");
  const [q, setQ] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("limit", "200");
    params.set("view", view);
    params.set("includeHidden", String(includeHidden));
    if (q.trim()) params.set("q", q.trim());

    setLoading(true);
    fetch(`/api/alerts?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
        setCounts(data.counts || null);
      })
      .finally(() => setLoading(false));
  }, [view, includeHidden, q]);

  async function setDecision(alertId: string, decision: "" | "applied" | "skip") {
    const note =
      decision === ""
        ? ""
        : (window.prompt(`Optional note for "${decision}"`, "") || "").trim();

    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userDecision: decision, decisionNote: note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? {
                ...a,
                userDecision: data.userDecision,
                decisionNote: data.decisionNote,
                decidedAt: data.decidedAt,
              }
            : a
        )
      );
      toast.success(decision ? `Marked as ${decision}` : "Decision cleared");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update decision");
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, AlertItem[]>();
    for (const alert of alerts) {
      const key = groupBy === "company" ? alert.company : alert.title;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(alert);
    }

    return Array.from(map.entries())
      .map(([key, items]) => ({ key, items }))
      .sort((a, b) => {
        const bestA = Math.max(...a.items.map((i) => i.fit.score));
        const bestB = Math.max(...b.items.map((i) => i.fit.score));
        return bestB - bestA;
      });
  }, [alerts, groupBy]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Jobs Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Broad capture from target companies, then soft-ranked fit recommendations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
          <div className="rounded border p-2">Total: {counts?.total ?? 0}</div>
          <div className="rounded border p-2">Strong: {counts?.strong ?? 0}</div>
          <div className="rounded border p-2">Maybe: {counts?.maybe ?? 0}</div>
          <div className="rounded border p-2">Fit Skip: {counts?.fitSkip ?? 0}</div>
          <div className="rounded border p-2">Hidden: {counts?.hidden ?? 0}</div>
          <div className="rounded border p-2">Reposted: {counts?.reposted ?? 0}</div>
          <div className="rounded border p-2">Active: {counts?.active ?? 0}</div>
          <div className="rounded border p-2">Stale: {counts?.stale ?? 0}</div>
          <div className="rounded border p-2">Applied: {counts?.applied ?? 0}</div>
          <div className="rounded border p-2">Skipped: {counts?.skipped ?? 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Views</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {["all", "strong", "maybe", "fit-skip", "reposted", "stale", "applied", "skip"].map((v) => (
              <Button
                key={v}
                size="sm"
                variant={view === v ? "default" : "outline"}
                onClick={() => setView(v as ViewMode)}
              >
                {v}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={includeHidden ? "default" : "outline"}
              onClick={() => setIncludeHidden((prev) => !prev)}
            >
              {includeHidden ? "Including Hidden" : "Hidden Excluded"}
            </Button>
            <Button
              size="sm"
              variant={groupBy === "company" ? "default" : "outline"}
              onClick={() => setGroupBy("company")}
            >
              Group: Company
            </Button>
            <Button
              size="sm"
              variant={groupBy === "role" ? "default" : "outline"}
              onClick={() => setGroupBy("role")}
            >
              Group: Role
            </Button>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title/company/location"
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : grouped.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matching jobs for this view.</p>
          ) : (
            <div className="space-y-4">
              {grouped.map((group) => (
                <div key={group.key} className="rounded-md border">
                  <div className="border-b px-3 py-2 font-medium">
                    {group.key} <span className="text-xs text-muted-foreground">({group.items.length})</span>
                  </div>
                  <div className="divide-y">
                    {group.items
                      .slice()
                      .sort((a, b) => b.fit.score - a.fit.score)
                      .map((a) => (
                        <div key={a.id} className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 min-w-0">
                              <a
                                href={a.url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium underline break-words"
                              >
                                {a.title}
                              </a>
                              <p className="text-sm text-muted-foreground">
                                {a.company} {a.location ? `• ${a.location}` : ""}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                First seen {new Date(a.firstSeenAt).toLocaleString()}
                                {a.postedAt ? ` • Posted ${new Date(a.postedAt).toLocaleDateString()}` : ""}
                                {a.sourceUpdatedAt
                                  ? ` • Updated ${new Date(a.sourceUpdatedAt).toLocaleDateString()}`
                                  : ""}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Last seen {new Date(a.lastSeenAt).toLocaleString()}
                                {a.seenCount > 1 ? ` • Seen ${a.seenCount}x` : ""}
                                {a.repostCount > 0 ? ` • Reposted ${a.repostCount}x` : ""}
                                {a.isActive ? " • Active" : " • Stale"}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                <Badge variant={recommendationVariant(a.fit.recommendation)}>
                                  {a.fit.recommendation.toUpperCase()} ({a.fit.score})
                                </Badge>
                                {a.fit.hiddenByKeyword && <Badge variant="outline">Hidden by keyword</Badge>}
                                {a.userDecision && <Badge variant="outline">Decision: {a.userDecision}</Badge>}
                              </div>
                              {a.fit.reasons.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  {a.fit.reasons.slice(0, 2).join(" • ")}
                                </p>
                              )}
                            </div>
                            <Badge variant={a.status === "notified" ? "default" : "outline"}>
                              {a.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant={a.userDecision === "applied" ? "default" : "outline"}
                              onClick={() => setDecision(a.id, "applied")}
                            >
                              Applied
                            </Button>
                            <Button
                              size="sm"
                              variant={a.userDecision === "skip" ? "default" : "outline"}
                              onClick={() => setDecision(a.id, "skip")}
                            >
                              Skip
                            </Button>
                            {a.userDecision && (
                              <Button size="sm" variant="ghost" onClick={() => setDecision(a.id, "")}>Clear</Button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
