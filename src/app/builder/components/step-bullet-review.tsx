"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  JDInterpretation,
  StrategyAssessment,
  SectionRecommendation,
  BulletReview,
} from "@/types";
import BulletReviewCard from "./bullet-review-card";
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

interface StepBulletReviewProps {
  jobDescription: string;
  interpretation: JDInterpretation;
  strategyAssessment: StrategyAssessment | null;
  userNotes: string;
  formatSections: SectionConfig[];
  sectionResults: SectionWithSelections[] | null;
  setSectionResults: (results: SectionWithSelections[] | null) => void;
  bulletReviews: Record<string, BulletReview>;
  setBulletReviews: (reviews: Record<string, BulletReview>) => void;
  bulletDecisions: Record<string, BulletDecision>;
  setBulletDecisions: (decisions: Record<string, BulletDecision>) => void;
  onContinue: () => void;
  onBack: () => void;
}

export default function StepBulletReview({
  jobDescription,
  interpretation,
  strategyAssessment,
  userNotes,
  formatSections,
  sectionResults,
  setSectionResults,
  bulletReviews,
  setBulletReviews,
  bulletDecisions,
  setBulletDecisions,
  onContinue,
  onBack,
}: StepBulletReviewProps) {
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [reviewingSection, setReviewingSection] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);

  // Phase A: Get recommendations
  const fetchRecommendations = async () => {
    setLoadingRecs(true);
    try {
      const res = await fetch("/api/builder/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription,
          sections: formatSections,
          interpretation,
        }),
      });
      if (!res.ok) throw new Error("Failed to get recommendations");
      const data: SectionRecommendation[] = await res.json();

      const results: SectionWithSelections[] = formatSections.map((s, i) => ({
        ...s,
        recommendations: data[i]?.recommendations || [],
        selectedBulletIds: (data[i]?.recommendations || [])
          .slice(0, s.bulletCount)
          .map((r) => r.bulletId),
        formatSuggestion: data[i]?.formatSuggestion,
      }));
      setSectionResults(results);
      toast.success("Bullet recommendations loaded");
    } catch {
      toast.error("Failed to get recommendations");
    } finally {
      setLoadingRecs(false);
    }
  };

  // Toggle bullet selection
  const toggleBullet = (sectionIndex: number, bulletId: string) => {
    if (!sectionResults) return;
    setSectionResults(
      sectionResults.map((s, i) => {
        if (i !== sectionIndex) return s;
        const selected = s.selectedBulletIds.includes(bulletId)
          ? s.selectedBulletIds.filter((id) => id !== bulletId)
          : [...s.selectedBulletIds, bulletId];
        return { ...s, selectedBulletIds: selected };
      })
    );
  };

  // Phase B: Review selected bullets (batched per section)
  const reviewSelectedBullets = async () => {
    if (!sectionResults) return;

    // Collect all selected bullets with section context
    const allBullets: {
      bulletId: string;
      content: string;
      sectionRole: string;
      sectionCompany: string;
    }[] = [];

    for (const section of sectionResults) {
      for (const bulletId of section.selectedBulletIds) {
        const rec = section.recommendations.find((r) => r.bulletId === bulletId);
        if (rec) {
          allBullets.push({
            bulletId: rec.bulletId,
            content: rec.content,
            sectionRole: section.roleTitle,
            sectionCompany: section.company,
          });
        }
      }
    }

    if (allBullets.length === 0) {
      toast.error("No bullets selected to review");
      return;
    }

    // Group by section for batched calls
    const sectionGroups: Record<string, typeof allBullets> = {};
    for (const b of allBullets) {
      const key = `${b.sectionRole}@${b.sectionCompany}`;
      if (!sectionGroups[key]) sectionGroups[key] = [];
      sectionGroups[key].push(b);
    }

    setReviewingSection("all");
    const newReviews: Record<string, BulletReview> = {};

    try {
      // Batch per section
      const promises = Object.entries(sectionGroups).map(async ([, bullets]) => {
        const res = await fetch("/api/builder/review-bullets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bullets,
            interpretation,
            strategyAssessment,
            userNotes,
          }),
        });
        if (!res.ok) throw new Error("Review failed");
        const reviews: BulletReview[] = await res.json();
        for (const review of reviews) {
          newReviews[review.bulletId] = review;
        }
      });

      await Promise.all(promises);
      setBulletReviews(newReviews);

      // Auto-set decisions for "good" bullets
      const newDecisions: Record<string, BulletDecision> = { ...bulletDecisions };
      for (const [bulletId, review] of Object.entries(newReviews)) {
        if (review.verdict === "good") {
          newDecisions[bulletId] = {
            finalText: review.originalText,
            userDecision: "keep",
          };
        }
      }
      setBulletDecisions(newDecisions);

      setShowReview(true);
      toast.success("Bullet review complete");
    } catch {
      toast.error("Failed to review bullets");
    } finally {
      setReviewingSection(null);
    }
  };

  // Handle bullet decision actions
  const handleAcceptSuggestion = (bulletId: string, review: BulletReview) => {
    setBulletDecisions((prev) => ({
      ...prev,
      [bulletId]: {
        finalText: review.suggestedText || review.originalText,
        userDecision: "accept",
      },
    }));
  };

  const handleEditManually = (bulletId: string, text: string) => {
    setBulletDecisions((prev) => ({
      ...prev,
      [bulletId]: { finalText: text, userDecision: "edit" },
    }));
  };

  const handleKeepOriginal = (bulletId: string, originalText: string) => {
    setBulletDecisions((prev) => ({
      ...prev,
      [bulletId]: { finalText: originalText, userDecision: "keep" },
    }));
  };

  // Check if all selected bullets have decisions
  const allDecided = sectionResults
    ? sectionResults.every((s) =>
        s.selectedBulletIds.every((id) => bulletDecisions[id]?.userDecision)
      )
    : false;

  // Group results by company
  const groupResults = (resultsList: SectionWithSelections[]) => {
    const groups: { company: string; sections: (SectionWithSelections & { originalIndex: number })[] }[] = [];
    for (let i = 0; i < resultsList.length; i++) {
      const section = resultsList[i];
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.company.toLowerCase() === section.company.toLowerCase()) {
        lastGroup.sections.push({ ...section, originalIndex: i });
      } else {
        groups.push({
          company: section.company,
          sections: [{ ...section, originalIndex: i }],
        });
      }
    }
    return groups;
  };

  return (
    <div className="space-y-6">
      {/* Phase A: Get recommendations if not yet loaded */}
      {!sectionResults && (
        <Card>
          <CardHeader>
            <CardTitle>Bullet Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Get AI-ranked bullet recommendations for your selected format:
              {formatSections.map((s) => ` ${s.roleTitle} (${s.bulletCount})`).join(",")}
            </p>
            <div className="flex items-center gap-2">
              <Button onClick={fetchRecommendations} disabled={loadingRecs}>
                {loadingRecs ? "Getting Recommendations..." : "Get AI Recommendations"}
              </Button>
              <PromptLogViewer labels={["recommend-bullets"]} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bullet selection */}
      {sectionResults && !showReview && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Select Bullets</h2>
            <Button
              onClick={reviewSelectedBullets}
              disabled={!!reviewingSection || sectionResults.every((s) => s.selectedBulletIds.length === 0)}
            >
              {reviewingSection ? "Reviewing..." : "Review Selected Bullets"}
            </Button>
          </div>

          {groupResults(sectionResults).map((group, gIdx) => (
            <div key={gIdx} className="space-y-4">
              {group.sections.length > 1 && (
                <h3 className="text-sm font-medium text-muted-foreground border-b pb-1">
                  {group.company}
                </h3>
              )}
              {group.sections.map((section) => (
                <Card key={section.originalIndex}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {section.roleTitle} @ {section.company}
                      <span className="text-xs font-normal text-muted-foreground ml-2">
                        ({section.selectedBulletIds.length}/{section.bulletCount} selected)
                      </span>
                    </CardTitle>
                    {section.formatSuggestion && (
                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md text-xs text-blue-800 dark:text-blue-200">
                        {section.formatSuggestion}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {section.recommendations.map((rec) => {
                        const isSelected = section.selectedBulletIds.includes(rec.bulletId);
                        return (
                          <div
                            key={rec.bulletId}
                            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-primary/5 border border-primary/20"
                                : "bg-muted/30 hover:bg-muted/50"
                            }`}
                            onClick={() => toggleBullet(section.originalIndex, rec.bulletId)}
                          >
                            <div className="mt-0.5">
                              <div
                                className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                  isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                                }`}
                              >
                                {isSelected && (
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">{rec.content}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">Score: {rec.score}</Badge>
                                <span className="text-xs text-muted-foreground">{rec.reason}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {section.recommendations.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No recommendations available.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </>
      )}

      {/* Phase B: Review results */}
      {showReview && sectionResults && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Bullet Review</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReview(false)}
              >
                Back to Selection
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={reviewSelectedBullets}
                disabled={!!reviewingSection}
              >
                {reviewingSection ? "Re-reviewing..." : "Re-run Review"}
              </Button>
              <PromptLogViewer labels={["review-bullets"]} />
            </div>
          </div>

          {sectionResults.map((section, sIdx) => {
            const selectedBullets = section.selectedBulletIds
              .map((id) => bulletReviews[id])
              .filter(Boolean);

            if (selectedBullets.length === 0) return null;

            return (
              <Card key={sIdx}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {section.roleTitle} @ {section.company}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedBullets.map((review) => (
                    <BulletReviewCard
                      key={review.bulletId}
                      review={review}
                      finalText={bulletDecisions[review.bulletId]?.finalText || ""}
                      userDecision={bulletDecisions[review.bulletId]?.userDecision || ""}
                      onAcceptSuggestion={() => handleAcceptSuggestion(review.bulletId, review)}
                      onEditManually={(text) => handleEditManually(review.bulletId, text)}
                      onKeepOriginal={() => handleKeepOriginal(review.bulletId, review.originalText)}
                    />
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back to Format
        </Button>
        <Button
          onClick={onContinue}
          disabled={!showReview || !allDecided}
        >
          {!showReview
            ? "Review bullets first"
            : !allDecided
            ? "Decide on all bullets first"
            : "Continue to Final Review"}
        </Button>
      </div>
    </div>
  );
}
