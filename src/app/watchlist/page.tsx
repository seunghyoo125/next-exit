"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type SourceType = "greenhouse" | "lever" | "ashby";

interface WatchlistItem {
  id: string;
  company: string;
  sourceType: SourceType;
  sourceId: string;
  titleKeywords: string[];
  locationKeywords: string[];
  active: boolean;
  lastCheckedAt: string | null;
}

function parseKeywords(raw: string): string[] {
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [company, setCompany] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("greenhouse");
  const [sourceId, setSourceId] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [titleKeywords, setTitleKeywords] = useState("product manager, program manager");
  const [locationKeywords, setLocationKeywords] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<{
    valid: boolean;
    count?: number;
    sampleTitles?: string[];
    error?: string;
  } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/watchlist");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load watchlist");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function validateSourceConfig(): Promise<boolean> {
    if (!sourceId.trim()) {
      toast.error("Source ID is required");
      return false;
    }

    setValidating(true);
    try {
      const res = await fetch("/api/watchlist/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType, sourceId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setValidation({ valid: false, error: data.error || "Validation failed" });
        toast.error(data.error || "Validation failed");
        return false;
      }
      setValidation({
        valid: true,
        count: data.count,
        sampleTitles: Array.isArray(data.sampleTitles) ? data.sampleTitles : [],
      });
      toast.success(`Source validated (${data.count} jobs found)`);
      return true;
    } catch {
      setValidation({ valid: false, error: "Validation failed" });
      toast.error("Validation failed");
      return false;
    } finally {
      setValidating(false);
    }
  }

  async function detectSource() {
    if (!sourceUrl.trim()) {
      toast.error("Paste a careers/apply URL first");
      return;
    }
    setDetecting(true);
    try {
      const res = await fetch("/api/watchlist/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sourceUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Detection failed");
      if (!data.best) {
        toast.error("Could not detect source from this URL");
        return;
      }
      setSourceType(data.best.sourceType as SourceType);
      setSourceId(data.best.sourceId);
      setValidation(null);
      toast.success(`Detected ${data.best.sourceType}:${data.best.sourceId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Detection failed");
    } finally {
      setDetecting(false);
    }
  }

  async function createItem() {
    if (!company.trim() || !sourceId.trim()) {
      toast.error("Company and source ID are required");
      return;
    }
    const isValid = await validateSourceConfig();
    if (!isValid) return;

    setSaving(true);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          sourceType,
          sourceId,
          titleKeywords: parseKeywords(titleKeywords),
          locationKeywords: parseKeywords(locationKeywords),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      toast.success("Watchlist item added");
      setCompany("");
      setSourceId("");
      setSourceUrl("");
      setLocationKeywords("");
      setValidation(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: WatchlistItem) {
    try {
      const res = await fetch(`/api/watchlist/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !item.active }),
      });
      if (!res.ok) throw new Error();
      setItems((prev) =>
        prev.map((w) => (w.id === item.id ? { ...w, active: !w.active } : w))
      );
    } catch {
      toast.error("Failed to update watchlist item");
    }
  }

  async function removeItem(id: string) {
    try {
      const res = await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((w) => w.id !== id));
      toast.success("Removed");
    } catch {
      toast.error("Failed to remove watchlist item");
    }
  }

  async function runCheckNow() {
    try {
      const res = await fetch("/api/watchlist/check-now", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      if (data.mode === "preview") {
        toast.success(
          `Preview checked ${data.watchesChecked} watch: ${data.matchesFound} matches (${data.hiddenByKeyword} hidden)`
        );
      } else {
        toast.success(
          `Checked ${data.watchesChecked} watches, created ${data.alertsCreated} alerts`
        );
      }
      await load();
    } catch {
      toast.error("Failed to run job check");
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Job Watchlist</h1>
          <p className="text-muted-foreground mt-1">
            Track target companies and get alerts for matching role titles.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Check Now runs a fast preview sample. Full ingestion + notifications run via cron.
          </p>
        </div>
        <Button variant="outline" onClick={runCheckNow}>
          Preview Check
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Watch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Auto-Detect From URL</Label>
              <div className="flex gap-2">
                <Input
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="Paste careers or apply URL"
                />
                <Button variant="outline" onClick={detectSource} disabled={detecting}>
                  {detecting ? "Detecting..." : "Detect"}
                </Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Company</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="OpenAI" />
            </div>
            <div className="space-y-1">
              <Label>Source Type</Label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={sourceType}
                onChange={(e) => {
                  setSourceType(e.target.value as SourceType);
                  setValidation(null);
                }}
              >
                <option value="greenhouse">Greenhouse</option>
                <option value="lever">Lever</option>
                <option value="ashby">Ashby</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Source ID</Label>
            <div className="flex gap-2">
              <Input
                value={sourceId}
                onChange={(e) => {
                  setSourceId(e.target.value);
                  setValidation(null);
                }}
                placeholder="e.g. openai (Greenhouse/Ashby slug) or company slug for Lever"
              />
              <Button
                variant="outline"
                onClick={validateSourceConfig}
                disabled={validating || !sourceId.trim()}
              >
                {validating ? "Validating..." : "Validate"}
              </Button>
            </div>
            {validation && (
              <p className={`text-xs ${validation.valid ? "text-muted-foreground" : "text-destructive"}`}>
                {validation.valid
                  ? `Valid source. Found ${validation.count ?? 0} jobs${validation.sampleTitles?.length ? ` (e.g. ${validation.sampleTitles.slice(0, 2).join(" | ")})` : ""}.`
                  : validation.error || "Validation failed"}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Title Keywords (comma-separated)</Label>
            <Input
              value={titleKeywords}
              onChange={(e) => setTitleKeywords(e.target.value)}
              placeholder="product manager, program manager"
            />
          </div>
          <div className="space-y-1">
            <Label>Location Keywords (optional)</Label>
            <Input
              value={locationKeywords}
              onChange={(e) => setLocationKeywords(e.target.value)}
              placeholder="san francisco, remote"
            />
          </div>
          <Button onClick={createItem} disabled={saving}>
            {saving ? "Adding..." : "Add Watch"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Watches</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No watches yet.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.company}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.sourceType}:{item.sourceId}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Titles: {item.titleKeywords.join(", ") || "any"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Locations: {item.locationKeywords.join(", ") || "any"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Last checked:{" "}
                        {item.lastCheckedAt
                          ? new Date(item.lastCheckedAt).toLocaleString()
                          : "Never"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={item.active ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleActive(item)}
                      >
                        {item.active ? "Active" : "Paused"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        Delete
                      </Button>
                    </div>
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
