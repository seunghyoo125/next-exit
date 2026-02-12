"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";
import { JDInterpretation, StrategyAssessment } from "@/types";
import PromptLogViewer from "./prompt-log-viewer";

interface StepStrategyProps {
  interpretation: JDInterpretation;
  strategyAssessment: StrategyAssessment | null;
  setStrategyAssessment: (assessment: StrategyAssessment | null) => void;
  userNotes: string;
  setUserNotes: (notes: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export default function StepStrategy({
  interpretation,
  strategyAssessment,
  setStrategyAssessment,
  userNotes,
  setUserNotes,
  onContinue,
  onBack,
}: StepStrategyProps) {
  const [loading, setLoading] = useState(false);

  const runAssessment = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/builder/assess-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interpretation }),
      });
      if (!res.ok) throw new Error("Failed to assess strategy");
      const data: StrategyAssessment = await res.json();
      setStrategyAssessment(data);
      toast.success("Strategy assessment complete");
    } catch {
      toast.error("Failed to run strategy assessment");
    } finally {
      setLoading(false);
    }
  };

  const readinessBadge = (readiness: string) => {
    const styles =
      readiness === "strong"
        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-700"
        : readiness === "stretch"
        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700"
        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700";
    return (
      <Badge className={`text-sm ${styles}`} variant="outline">
        {readiness.charAt(0).toUpperCase() + readiness.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {!strategyAssessment && (
        <Card>
          <CardHeader>
            <CardTitle>Strategy Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Get an honest assessment of how well your bullet bank aligns with this role,
              whether a top 5% resume is achievable, and what strategy to follow.
            </p>
            <Button onClick={runAssessment} disabled={loading}>
              {loading ? "Analyzing your fit..." : "Run Strategy Assessment"}
            </Button>
          </CardContent>
        </Card>
      )}

      {strategyAssessment && (
        <>
          {/* Overall Readiness */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Overall Readiness</CardTitle>
                {readinessBadge(strategyAssessment.overallReadiness)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Core Work Alignment</Label>
                <ul className="space-y-1.5 mt-1">
                  {strategyAssessment.coreWorkAlignment.map((item, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-muted-foreground mt-0.5">&#x2022;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Top 5% Viability</Label>
                <ul className="space-y-1.5 mt-1">
                  {strategyAssessment.topFivePercentViability.map((item, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-muted-foreground mt-0.5">&#x2022;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Strengths & Gaps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Strengths to Leverage</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {strategyAssessment.strengthsToLeverage.map((s, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">&#x2022;</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Critical Gaps</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {strategyAssessment.criticalGaps.map((g, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-destructive mt-0.5">&#x2022;</span>
                      {g}
                    </li>
                  ))}
                  {strategyAssessment.criticalGaps.length === 0 && (
                    <li className="text-sm text-muted-foreground">None identified</li>
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Lead / De-emphasize Themes */}
          {(strategyAssessment.leadWithThemes.length > 0 || strategyAssessment.deEmphasizeThemes.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Lead With</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {strategyAssessment.leadWithThemes.map((t, i) => (
                      <Badge key={i} variant="secondary">{t}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">De-emphasize</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {strategyAssessment.deEmphasizeThemes.map((t, i) => (
                      <Badge key={i} variant="outline">{t}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Fluff & Jargon Disregarded */}
          {strategyAssessment.fluffAndJargon.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Fluff & Jargon Disregarded</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-2">
                  These JD phrases were identified as filler and not used for fit assessment.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {strategyAssessment.fluffAndJargon.map((item, i) => (
                    <Badge key={i} variant="outline" className="text-muted-foreground">
                      {item}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Execution Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Execution Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {strategyAssessment.executionPlan.map((item, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-muted-foreground mt-0.5">&#x2022;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Re-run button + View Prompt */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={runAssessment} disabled={loading}>
              {loading ? "Re-analyzing..." : "Re-run Assessment"}
            </Button>
            <PromptLogViewer labels={["assess-strategy"]} />
          </div>
        </>
      )}

      {/* User Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes to Model</CardTitle>
        </CardHeader>
        <CardContent>
          <Label className="text-xs text-muted-foreground">
            Add any context that should carry through all subsequent steps (e.g., &quot;emphasize TPM skills&quot;, &quot;I also have X experience not in bullets&quot;)
          </Label>
          <Textarea
            value={userNotes}
            onChange={(e) => setUserNotes(e.target.value)}
            placeholder="Optional notes..."
            className="mt-2 min-h-[80px]"
          />
          <p className="text-xs text-muted-foreground mt-2">
            For persistent context across all builds, set up your{" "}
            <Link href="/profile" className="underline hover:text-foreground">
              Candidate Profile
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back to JD Analysis
        </Button>
        <Button onClick={onContinue} disabled={!strategyAssessment}>
          Continue to Format Selection
        </Button>
      </div>
    </div>
  );
}
