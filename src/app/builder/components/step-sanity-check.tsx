"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";
import {
  JDInterpretation,
  StrategyAssessment,
  BulletReview,
  SanityCheckResult,
} from "@/types";
import PromptLogViewer from "./prompt-log-viewer";

interface SectionConfig {
  roleTitle: string;
  company: string;
  bulletCount: number;
}

interface RecommendedBullet {
  bulletId: string;
  content: string;
  score: number;
  reason: string;
}

interface SectionWithSelections extends SectionConfig {
  recommendations: RecommendedBullet[];
  selectedBulletIds: string[];
  formatSuggestion?: string;
}

interface BulletDecision {
  finalText: string;
  userDecision: string; // "accept" | "edit" | "keep"
}

interface StepSanityCheckProps {
  title: string;
  jobDescription: string;
  interpretation: JDInterpretation;
  strategyAssessment: StrategyAssessment | null;
  sectionResults: SectionWithSelections[];
  bulletReviews: Record<string, BulletReview>;
  bulletDecisions: Record<string, BulletDecision>;
  sanityCheck: SanityCheckResult | null;
  setSanityCheck: (result: SanityCheckResult | null) => void;
  savedId: string | null;
  setSavedId: (id: string | null) => void;
  draftId: string | null;
  onBack: () => void;
}

export default function StepSanityCheck({
  title,
  jobDescription,
  interpretation,
  strategyAssessment,
  sectionResults,
  bulletReviews,
  bulletDecisions,
  sanityCheck,
  setSanityCheck,
  savedId,
  setSavedId,
  draftId,
  onBack,
}: StepSanityCheckProps) {
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  // Get final text for each bullet (from reviews/decisions or original)
  const getFinalText = (bulletId: string): string => {
    const decision = bulletDecisions[bulletId];
    if (decision?.finalText) return decision.finalText;

    const review = bulletReviews[bulletId];
    if (!review) {
      // No review — find original text from sectionResults
      for (const section of sectionResults) {
        const rec = section.recommendations.find((r) => r.bulletId === bulletId);
        if (rec) return rec.content;
      }
      return "";
    }
    // Fallback for old data if no explicit decision is present
    return review.suggestedText || review.originalText;
  };

  // Build final bullet list
  const buildFinalBullets = () => {
    const bullets: { sectionRole: string; sectionCompany: string; text: string; bulletId: string }[] = [];
    for (const section of sectionResults) {
      for (const bulletId of section.selectedBulletIds) {
        bullets.push({
          sectionRole: section.roleTitle,
          sectionCompany: section.company,
          text: getFinalText(bulletId),
          bulletId,
        });
      }
    }
    return bullets;
  };

  const runSanityCheck = async () => {
    const bullets = buildFinalBullets();
    if (bullets.length === 0) {
      toast.error("No bullets to review");
      return;
    }

    setChecking(true);
    try {
      const res = await fetch("/api/builder/sanity-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bullets: bullets.map((b) => ({
            sectionRole: b.sectionRole,
            sectionCompany: b.sectionCompany,
            text: b.text,
          })),
          interpretation,
          strategyAssessment,
        }),
      });
      if (!res.ok) throw new Error();
      const result: SanityCheckResult = await res.json();
      setSanityCheck(result);
      toast.success("Sanity check complete");
    } catch {
      toast.error("Failed to run sanity check");
    } finally {
      setChecking(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please go back and add a title");
      return;
    }

    setSaving(true);
    try {
      // Build sections with finalText for each bullet
      const sections = sectionResults.map((section) => ({
        roleTitle: section.roleTitle,
        company: section.company,
        bulletCount: section.bulletCount,
        bulletIds: section.selectedBulletIds,
        bulletFinalTexts: section.selectedBulletIds.map((id) => ({
          bulletId: id,
          finalText: getFinalText(id),
          reviewVerdict: bulletReviews[id]?.verdict || "",
          reviewFeedback: bulletReviews[id]?.feedback || "",
          suggestedText: bulletReviews[id]?.suggestedText || "",
          userDecision: bulletDecisions[id]?.userDecision || (bulletReviews[id] ? "accept" : "keep"),
        })),
      }));

      const res = await fetch("/api/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          jobDescription,
          sections,
          draftId,
          interpretation,
          strategyAssessment,
          sanityCheck,
          status: "complete",
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSavedId(data.id);
      toast.success("Resume build saved!");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const copyAllFinal = () => {
    const bullets = buildFinalBullets();
    const grouped: Record<string, string[]> = {};
    for (const b of bullets) {
      const key = `${b.sectionRole} @ ${b.sectionCompany}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(b.text);
    }
    const text = Object.entries(grouped)
      .map(([section, buls]) => `${section}\n${buls.map((b) => `  - ${b}`).join("\n")}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Copied all final bullets!");
  };

  const finalBullets = buildFinalBullets();

  return (
    <div className="space-y-6">
      {/* Resume Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Final Resume Preview</CardTitle>
            <Button variant="outline" size="sm" onClick={copyAllFinal}>
              Copy All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {sectionResults.map((section, sIdx) => {
            const sectionBullets = finalBullets.filter(
              (b) => b.sectionRole === section.roleTitle && b.sectionCompany === section.company
            );
            if (sectionBullets.length === 0) return null;

            return (
              <div key={sIdx}>
                <h3 className="text-sm font-medium mb-2">
                  {section.roleTitle} @ {section.company}
                </h3>
                <div className="space-y-1.5">
                  {sectionBullets.map((b, bIdx) => (
                    <div key={bIdx} className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground mt-0.5 shrink-0">-</span>
                      <span>{b.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Sanity Check */}
      {!sanityCheck && (
        <Button onClick={runSanityCheck} disabled={checking}>
          {checking ? "Running Final Review..." : "Run Final Review"}
        </Button>
      )}

      {sanityCheck && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Final Review</CardTitle>
                <Badge
                  className={`text-sm ${
                    sanityCheck.finalVerdict === "ready"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-700"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700"
                  }`}
                  variant="outline"
                >
                  {sanityCheck.finalVerdict === "ready" ? "Ready" : "Needs Changes"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Overall Coherence</p>
                <p className="text-sm leading-relaxed">{sanityCheck.overallCoherence}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Tone Consistency</p>
                <p className="text-sm leading-relaxed">{sanityCheck.toneConsistency}</p>
              </div>

              {sanityCheck.narrativeGaps.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Narrative Gaps</p>
                  <ul className="space-y-1">
                    {sanityCheck.narrativeGaps.map((gap, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-destructive mt-0.5">&#x2022;</span>
                        {gap}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {sanityCheck.redundancies.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Redundancies</p>
                  <ul className="space-y-1">
                    {sanityCheck.redundancies.map((r, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-yellow-600 mt-0.5">&#x2022;</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {sanityCheck.suggestions.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Suggestions</p>
                  <ul className="space-y-1.5">
                    {sanityCheck.suggestions.map((s, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-primary mt-0.5">&#x2022;</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={runSanityCheck} disabled={checking}>
              {checking ? "Re-running..." : "Re-run Final Review"}
            </Button>
            <PromptLogViewer labels={["sanity-check"]} />
          </div>
        </>
      )}

      {/* Save */}
      {savedId && (
        <div className="p-3 bg-muted rounded-lg text-sm">
          Saved!{" "}
          <Link href={`/builder/${savedId}`} className="underline font-medium">
            View saved build
          </Link>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back to Bullets
        </Button>
        <Button onClick={handleSave} disabled={saving || !!savedId}>
          {saving ? "Saving..." : savedId ? "Saved" : "Save Final Resume"}
        </Button>
      </div>
    </div>
  );
}
