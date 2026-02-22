"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  JDInterpretation,
  StrategyAssessment,
  SanityCheckResult,
  BuilderStep,
  BulletReview,
} from "@/types";
import BuilderStepper from "./components/builder-stepper";
import StepJDAnalysis from "./components/step-jd-analysis";
import StepStrategy from "./components/step-strategy";
import StepFormat from "./components/step-format";
import StepBulletReview from "./components/step-bullet-review";
import StepSanityCheck from "./components/step-sanity-check";
import RoleComparisonMode from "./components/role-comparison-mode";
import SavedBuildsList from "./components/saved-builds-list";
import { useBuilderDraft } from "./hooks/use-builder-draft";

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

interface FormatPreset {
  label: string;
  sections: SectionConfig[];
}

const FORMAT_PRESETS: FormatPreset[] = [
  {
    label: "7/4/1 (Manager + SA + Partnership)",
    sections: [
      { roleTitle: "Manager", company: "PwC", bulletCount: 7 },
      { roleTitle: "Senior Associate", company: "PwC", bulletCount: 4 },
      { roleTitle: "Partnership", company: "PwC", bulletCount: 1 },
    ],
  },
  {
    label: "7/4 (Manager + SA)",
    sections: [
      { roleTitle: "Manager", company: "PwC", bulletCount: 7 },
      { roleTitle: "Senior Associate", company: "PwC", bulletCount: 4 },
    ],
  },
  {
    label: "8/4 (Manager + SA)",
    sections: [
      { roleTitle: "Manager", company: "PwC", bulletCount: 8 },
      { roleTitle: "Senior Associate", company: "PwC", bulletCount: 4 },
    ],
  },
];

function BuilderPageInner() {
  const [builderMode, setBuilderMode] = useState<"build" | "roleComparison">("build");

  // Stepper state
  const [currentStep, setCurrentStep] = useState<BuilderStep>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Step 1: JD Analysis
  const [title, setTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [interpretation, setInterpretation] = useState<JDInterpretation | null>(null);

  // Step 2: Strategy
  const [strategyAssessment, setStrategyAssessment] = useState<StrategyAssessment | null>(null);
  const [userNotes, setUserNotes] = useState("");

  // Step 3: Format
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);
  const [formatSections, setFormatSections] = useState<SectionConfig[]>([]);
  const [formatRationale, setFormatRationale] = useState("");

  // Step 4: Bullets
  const [sectionResults, setSectionResults] = useState<SectionWithSelections[] | null>(null);
  const [bulletReviews, setBulletReviews] = useState<Record<string, BulletReview>>({});
  const [bulletDecisions, setBulletDecisions] = useState<Record<string, BulletDecision>>({});

  // Step 5: Sanity Check
  const [sanityCheck, setSanityCheck] = useState<SanityCheckResult | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Draft persistence
  const { draftId, saving, lastSavedAt, createDraft, updateDraft, updateDraftDebounced, loadDraft } = useBuilderDraft();

  // Load draft from URL params (reactive to client-side navigation)
  const searchParams = useSearchParams();
  const draftParam = searchParams.get("draft");

  useEffect(() => {
    if (draftParam) {
      loadDraft(draftParam).then(({ draft, interpretation: interp, strategyAssessment: strategy, sanityCheck: sc }) => {
        setTitle(draft.title);
        setJobDescription(draft.jobDescription);
        setCurrentStep(draft.currentStep as BuilderStep);
        setUserNotes(draft.userNotes);
        if (draft.formatPreset) {
          const idx = FORMAT_PRESETS.findIndex(p => p.label === draft.formatPreset);
          setSelectedPresetIndex(idx);
          if (idx >= 0) setFormatSections(FORMAT_PRESETS[idx].sections);
        }
        if (interp) setInterpretation(interp);
        if (strategy) setStrategyAssessment(strategy);
        if (sc) setSanityCheck(sc);

        // Mark completed steps
        const completed = new Set<number>();
        for (let i = 1; i < draft.currentStep; i++) completed.add(i);
        setCompletedSteps(completed);
      }).catch(() => {
        toast.error("Failed to load draft");
      });
    }
  }, [draftParam, loadDraft]);

  // Step invalidation: changing Step 1 data resets Steps 2-5
  const invalidateDownstream = useCallback((fromStep: number) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      for (let i = fromStep; i <= 5; i++) next.delete(i);
      return next;
    });
    if (fromStep <= 2) {
      setStrategyAssessment(null);
      setUserNotes("");
    }
    if (fromStep <= 3) {
      setSelectedPresetIndex(null);
      setFormatSections([]);
      setFormatRationale("");
    }
    if (fromStep <= 4) {
      setSectionResults(null);
      setBulletReviews({});
      setBulletDecisions({});
    }
    if (fromStep <= 5) {
      setSanityCheck(null);
    }
  }, []);

  const completeStep = useCallback((step: BuilderStep) => {
    setCompletedSteps(prev => new Set([...prev, step]));
  }, []);

  const goToStep = useCallback((step: BuilderStep) => {
    setCurrentStep(step);
    if (draftId) {
      updateDraft({ currentStep: step });
    }
  }, [draftId, updateDraft]);

  const handleStepClick = useCallback((step: BuilderStep) => {
    if (completedSteps.has(step) || step === currentStep) {
      goToStep(step);
    }
  }, [completedSteps, currentStep, goToStep]);

  // Step 1 → Step 2 transition
  const handleStep1Continue = useCallback(async () => {
    if (!interpretation) return;
    completeStep(1);

    // Create draft if not yet created
    if (!draftId) {
      try {
        await createDraft({ title, jobDescription, interpretation });
      } catch {
        toast.error("Failed to create draft");
      }
    } else {
      updateDraft({ interpretation, currentStep: 2 });
    }

    goToStep(2);
  }, [interpretation, draftId, createDraft, updateDraft, title, jobDescription, completeStep, goToStep]);

  // Step 2 → Step 3 transition
  const handleStep2Continue = useCallback(() => {
    if (!strategyAssessment) return;
    completeStep(2);
    if (draftId) {
      updateDraft({ strategyAssessment, userNotes, currentStep: 3 });
    }
    goToStep(3);
  }, [strategyAssessment, draftId, updateDraft, userNotes, completeStep, goToStep]);

  // Step 3 → Step 4 transition
  const handleStep3Continue = useCallback(() => {
    if (formatSections.length === 0) return;
    completeStep(3);
    const presetLabel = selectedPresetIndex !== null ? FORMAT_PRESETS[selectedPresetIndex]?.label || "" : "custom";
    if (draftId) {
      updateDraft({ formatPreset: presetLabel, currentStep: 4 });
    }
    goToStep(4);
  }, [formatSections, selectedPresetIndex, draftId, updateDraft, completeStep, goToStep]);

  // Step 4 → Step 5 transition
  const handleStep4Continue = useCallback(() => {
    if (!sectionResults) return;
    completeStep(4);
    if (draftId) {
      updateDraft({ currentStep: 5 });
    }
    goToStep(5);
  }, [sectionResults, draftId, updateDraft, completeStep, goToStep]);

  // Save & Exit: persist current state then navigate to builds list
  const handleSaveAndExit = useCallback(async () => {
    if (!draftId) return;
    try {
      await updateDraft({
        currentStep,
        userNotes,
        ...(interpretation ? { interpretation } : {}),
        ...(strategyAssessment ? { strategyAssessment } : {}),
        ...(sanityCheck ? { sanityCheck } : {}),
      });
      window.location.href = "/builder";
    } catch {
      toast.error("Failed to save draft");
    }
  }, [draftId, updateDraft, currentStep, userNotes, interpretation, strategyAssessment, sanityCheck]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Next Exit</h1>
        <p className="text-muted-foreground mt-1">
          Guided multi-step resume builder with AI analysis and review
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={builderMode === "build" ? "default" : "outline"}
          size="sm"
          onClick={() => setBuilderMode("build")}
        >
          Build Resume
        </Button>
        <Button
          variant={builderMode === "roleComparison" ? "default" : "outline"}
          size="sm"
          onClick={() => setBuilderMode("roleComparison")}
        >
          Compare Roles
        </Button>
      </div>

      {builderMode === "build" && (
        <>
          {/* Stepper + Save controls */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <BuilderStepper
                currentStep={currentStep}
                completedSteps={completedSteps}
                onStepClick={handleStepClick}
              />
            </div>
            {draftId && (
              <div className="flex items-center gap-3 shrink-0">
                <Button variant="outline" size="sm" onClick={handleSaveAndExit}>
                  Save & Exit
                </Button>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {saving
                    ? "Saving..."
                    : lastSavedAt
                      ? `Draft saved at ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                      : null}
                </p>
              </div>
            )}
          </div>

          {/* Saved Builds List (shown when on Step 1 with no active draft) */}
          {currentStep === 1 && !draftId && (
            <SavedBuildsList />
          )}

          {/* Step 1: JD Analysis */}
          {currentStep === 1 && (
            <StepJDAnalysis
              title={title}
              setTitle={setTitle}
              jobDescription={jobDescription}
              setJobDescription={(jd) => {
                setJobDescription(jd);
                invalidateDownstream(2);
              }}
              interpretation={interpretation}
              setInterpretation={(interp) => {
                setInterpretation(interp);
                invalidateDownstream(2);
              }}
              onContinue={handleStep1Continue}
              onTitleChange={(t) => {
                if (draftId) updateDraftDebounced({ title: t });
              }}
              onJDChange={(jd) => {
                if (draftId) updateDraftDebounced({ jobDescription: jd });
              }}
            />
          )}

          {/* Step 2: Strategy Assessment */}
          {currentStep === 2 && interpretation && (
            <StepStrategy
              interpretation={interpretation}
              strategyAssessment={strategyAssessment}
              setStrategyAssessment={setStrategyAssessment}
              userNotes={userNotes}
              setUserNotes={(notes) => {
                setUserNotes(notes);
                if (draftId) updateDraftDebounced({ userNotes: notes });
              }}
              onContinue={handleStep2Continue}
              onBack={() => goToStep(1)}
            />
          )}

          {/* Step 3: Format Recommendation */}
          {currentStep === 3 && interpretation && (
            <StepFormat
              interpretation={interpretation}
              strategyAssessment={strategyAssessment}
              formatPresets={FORMAT_PRESETS}
              selectedPresetIndex={selectedPresetIndex}
              setSelectedPresetIndex={setSelectedPresetIndex}
              formatSections={formatSections}
              setFormatSections={setFormatSections}
              formatRationale={formatRationale}
              setFormatRationale={setFormatRationale}
              onContinue={handleStep3Continue}
              onBack={() => goToStep(2)}
            />
          )}

          {/* Step 4: Bullet Selection + Review */}
          {currentStep === 4 && interpretation && (
            <StepBulletReview
              jobDescription={jobDescription}
              interpretation={interpretation}
              strategyAssessment={strategyAssessment}
              userNotes={userNotes}
              formatSections={formatSections}
              sectionResults={sectionResults}
              setSectionResults={setSectionResults}
              bulletReviews={bulletReviews}
              setBulletReviews={setBulletReviews}
              bulletDecisions={bulletDecisions}
              setBulletDecisions={setBulletDecisions}
              onContinue={handleStep4Continue}
              onBack={() => goToStep(3)}
            />
          )}

          {/* Step 5: Final Sanity Check */}
          {currentStep === 5 && interpretation && sectionResults && (
            <StepSanityCheck
              title={title}
              jobDescription={jobDescription}
              interpretation={interpretation}
              strategyAssessment={strategyAssessment}
              sectionResults={sectionResults}
              bulletReviews={bulletReviews}
              bulletDecisions={bulletDecisions}
              sanityCheck={sanityCheck}
              setSanityCheck={setSanityCheck}
              savedId={savedId}
              setSavedId={setSavedId}
              draftId={draftId}
              onBack={() => goToStep(4)}
            />
          )}
        </>
      )}

      {builderMode === "roleComparison" && <RoleComparisonMode />}
    </div>
  );
}

export default function BuilderPage() {
  return (
    <Suspense>
      <BuilderPageInner />
    </Suspense>
  );
}
