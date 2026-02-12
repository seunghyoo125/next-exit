"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface PromptLogData {
  label: string;
  system?: string;
  prompt: string;
  response: string;
  provider: string;
  model: string;
  timestamp: string;
}

interface PromptLogViewerProps {
  labels: string[];
}

export default function PromptLogViewer({ labels }: PromptLogViewerProps) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<Record<string, PromptLogData | null>>({});
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);

    // Only fetch labels we haven't loaded yet
    const toFetch = labels.filter((l) => !(l in logs));
    if (toFetch.length === 0) return;

    setLoading(true);
    try {
      const results = await Promise.all(
        toFetch.map(async (label) => {
          try {
            const res = await fetch(`/api/debug/prompt-logs?label=${encodeURIComponent(label)}`);
            if (res.ok) return { label, data: (await res.json()) as PromptLogData };
          } catch {
            // silently fail per label
          }
          return { label, data: null };
        })
      );
      setLogs((prev) => {
        const next = { ...prev };
        for (const r of results) next[r.label] = r.data;
        return next;
      });
    } finally {
      setLoading(false);
    }
  };

  const renderLog = (label: string, log: PromptLogData | null | undefined) => {
    if (log === undefined) return null;
    if (!log) {
      return (
        <p className="text-sm text-muted-foreground">
          No prompt log found for &quot;{label}&quot;. Run the AI step first.
        </p>
      );
    }
    return (
      <div className="space-y-3">
        {labels.length > 1 && (
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {log.provider} / {log.model} &mdash; {log.timestamp}
        </p>
        {log.system && (
          <div>
            <Label className="text-xs text-muted-foreground">System Prompt</Label>
            <pre className="mt-1 text-xs bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto">
              {log.system}
            </pre>
          </div>
        )}
        <div>
          <Label className="text-xs text-muted-foreground">User Prompt</Label>
          <pre className="mt-1 text-xs bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto">
            {log.prompt}
          </pre>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Response</Label>
          <pre className="mt-1 text-xs bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto">
            {log.response}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={toggle}>
        {open ? "Hide Prompt" : "View Prompt"}
      </Button>

      {open && (
        <Card>
          <CardContent className="pt-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading prompt log...</p>
            ) : (
              <div className="space-y-6">
                {labels.map((label) => (
                  <div key={label}>{renderLog(label, logs[label])}</div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
