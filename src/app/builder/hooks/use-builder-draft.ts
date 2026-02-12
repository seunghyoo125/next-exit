import { useState, useCallback, useRef } from "react";
import {
  JDInterpretation,
  StrategyAssessment,
  SanityCheckResult,
  BuilderStep,
} from "@/types";

interface DraftData {
  id: string;
  title: string;
  jobDescription: string;
  status: string;
  currentStep: number;
  interpretation: string;
  strategyAssessment: string;
  userNotes: string;
  formatPreset: string;
  sanityCheck: string;
}

export function useBuilderDraft() {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const createDraft = useCallback(
    async (data: {
      title: string;
      jobDescription: string;
      interpretation?: JDInterpretation;
    }): Promise<string> => {
      const res = await fetch("/api/builder/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create draft");
      const draft: DraftData = await res.json();
      setDraftId(draft.id);
      return draft.id;
    },
    []
  );

  const updateDraft = useCallback(
    async (data: {
      title?: string;
      jobDescription?: string;
      currentStep?: BuilderStep;
      interpretation?: JDInterpretation;
      strategyAssessment?: StrategyAssessment;
      userNotes?: string;
      formatPreset?: string;
      sanityCheck?: SanityCheckResult;
      status?: string;
    }) => {
      if (!draftId) return;
      setSaving(true);
      try {
        await fetch(`/api/builder/draft/${draftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        setLastSavedAt(new Date());
      } finally {
        setSaving(false);
      }
    },
    [draftId]
  );

  const updateDraftDebounced = useCallback(
    (data: Parameters<typeof updateDraft>[0]) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateDraft(data);
      }, 1000);
    },
    [updateDraft]
  );

  const loadDraft = useCallback(
    async (
      id: string
    ): Promise<{
      draft: DraftData;
      interpretation: JDInterpretation | null;
      strategyAssessment: StrategyAssessment | null;
      sanityCheck: SanityCheckResult | null;
    }> => {
      const res = await fetch(`/api/builder/draft/${id}`);
      if (!res.ok) throw new Error("Failed to load draft");
      const draft: DraftData = await res.json();
      setDraftId(draft.id);

      let interpretation: JDInterpretation | null = null;
      let strategyAssessment: StrategyAssessment | null = null;
      let sanityCheck: SanityCheckResult | null = null;

      try {
        if (draft.interpretation) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parsed: any = JSON.parse(draft.interpretation);
          // Backward compat: old drafts stored these as strings
          if (typeof parsed.roleSummary === "string") {
            parsed.roleSummary = [parsed.roleSummary];
          }
          if (typeof parsed.matchGuidance === "string") {
            parsed.matchGuidance = [parsed.matchGuidance];
          }
          interpretation = parsed;
        }
      } catch { /* ignore */ }
      try {
        if (draft.strategyAssessment) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parsed: any = JSON.parse(draft.strategyAssessment);
          // Backward compat: old drafts stored these as strings
          if (typeof parsed.coreWorkAlignment === "string") {
            parsed.coreWorkAlignment = [parsed.coreWorkAlignment];
          }
          if (typeof parsed.topFivePercentViability === "string") {
            parsed.topFivePercentViability = [parsed.topFivePercentViability];
          }
          if (typeof parsed.executionPlan === "string") {
            parsed.executionPlan = [parsed.executionPlan];
          }
          strategyAssessment = parsed;
        }
      } catch { /* ignore */ }
      try {
        if (draft.sanityCheck) sanityCheck = JSON.parse(draft.sanityCheck);
      } catch { /* ignore */ }

      return { draft, interpretation, strategyAssessment, sanityCheck };
    },
    []
  );

  return {
    draftId,
    setDraftId,
    saving,
    lastSavedAt,
    createDraft,
    updateDraft,
    updateDraftDebounced,
    loadDraft,
  };
}
