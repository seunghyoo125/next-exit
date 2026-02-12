"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface BuildSummary {
  id: string;
  title: string;
  status: string;
  currentStep: number;
  createdAt: string;
  updatedAt: string;
}

const STEP_LABELS: Record<number, string> = {
  1: "JD Analysis",
  2: "Strategy",
  3: "Format",
  4: "Bullets",
  5: "Review",
};

export default function SavedBuildsList() {
  const [builds, setBuilds] = useState<BuildSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/builder/draft")
      .then((res) => res.json())
      .then((data) => {
        setBuilds(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (builds.length === 0) return null;

  const drafts = builds.filter((b) => b.status === "draft");
  const completed = builds.filter((b) => b.status === "complete");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Saved Builds</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {drafts.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Drafts</p>
            <div className="space-y-2">
              {drafts.map((build) => (
                <div
                  key={build.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{build.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">
                        Step {build.currentStep}: {STEP_LABELS[build.currentStep] || "Unknown"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(build.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/builder?draft=${build.id}`}>Continue</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {completed.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Completed</p>
            <div className="space-y-2">
              {completed.map((build) => (
                <div
                  key={build.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{build.title}</p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(build.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/builder/${build.id}`}>View</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
