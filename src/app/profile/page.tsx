"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { GroundTruthProfile, ProfileRefinementResult } from "@/types";
import PromptLogViewer from "@/app/builder/components/prompt-log-viewer";

function DynamicListInput({
  label,
  items,
  onChange,
  max = 5,
  placeholder,
  readOnlyLabel,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  max?: number;
  placeholder?: string;
  readOnlyLabel?: string;
}) {
  const updateItem = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    onChange(next);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    if (items.length < max) {
      onChange([...items, ""]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <Label>{label}</Label>
        {readOnlyLabel && (
          <span className="text-xs text-muted-foreground italic">{readOnlyLabel}</span>
        )}
      </div>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={item}
            onChange={(e) => updateItem(i, e.target.value)}
            placeholder={placeholder}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => removeItem(i)}
            className="shrink-0"
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        disabled={items.length >= max}
      >
        Add {label.replace(/s$/, "")} {items.length >= max && `(max ${max})`}
      </Button>
    </div>
  );
}

export default function ProfilePage() {
  const [background, setBackground] = useState("");
  const [proofPoints, setProofPoints] = useState<string[]>([]);
  const [topStrengths, setTopStrengths] = useState<string[]>([]);
  const [constraints, setConstraints] = useState<string[]>([]);
  const [preferredTone, setPreferredTone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refinementResult, setRefinementResult] = useState<ProfileRefinementResult | null>(null);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string>>({});
  const [editedGroundTruth, setEditedGroundTruth] = useState<GroundTruthProfile | null>(null);
  const [savedGroundTruth, setSavedGroundTruth] = useState<GroundTruthProfile | null>(null);
  const [phase, setPhase] = useState<1 | 2>(1);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        setBackground(data.background || "");
        setProofPoints(data.proofPoints || []);
        setTopStrengths(data.topStrengths || []);
        setConstraints(data.constraints || []);
        setPreferredTone(data.preferredTone || "");
        if (data.groundTruth) {
          setSavedGroundTruth(data.groundTruth);
        }
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          background,
          proofPoints: proofPoints.filter((s) => s.trim()),
          topStrengths: topStrengths.filter((s) => s.trim()),
          constraints: constraints.filter((s) => s.trim()),
          preferredTone,
          groundTruth: editedGroundTruth || savedGroundTruth || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      if (editedGroundTruth) {
        setSavedGroundTruth(editedGroundTruth);
      }
      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleReviewProfile(
    mode: "default" | "enrichment",
    answers?: Record<string, string>,
    requestPhase: 1 | 2 = 1
  ) {
    setRefining(true);
    try {
      const confirmedSummary =
        requestPhase === 2
          ? (editedGroundTruth?.groundTruthSummary || savedGroundTruth?.groundTruthSummary || "")
          : undefined;

      const res = await fetch("/api/profile/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            background,
            proofPoints: proofPoints.filter((s) => s.trim()),
            topStrengths: topStrengths.filter((s) => s.trim()),
            constraints: constraints.filter((s) => s.trim()),
            preferredTone,
          },
          clarificationAnswers: answers,
          mode,
          phase: requestPhase,
          confirmedSummary,
        }),
      });
      if (!res.ok) throw new Error("Failed to refine profile");
      const result: ProfileRefinementResult = await res.json();
      setRefinementResult(result);
      setEditedGroundTruth(result.groundTruth);
      setPhase(result.phase);
      setClarificationAnswers({});
    } catch {
      toast.error("Failed to review profile");
    } finally {
      setRefining(false);
    }
  }

  function handleAcceptReflection() {
    if (editedGroundTruth) {
      setSavedGroundTruth(editedGroundTruth);
      toast.success("Reflection accepted — you can now normalize the structure or save as-is");
    }
  }

  function handleAcceptGroundTruth() {
    if (editedGroundTruth) {
      setSavedGroundTruth(editedGroundTruth);
      toast.success("Ground truth accepted — click Save Profile to persist");
    }
  }

  function updateGroundTruthField<K extends keyof GroundTruthProfile>(
    field: K,
    value: GroundTruthProfile[K]
  ) {
    if (!editedGroundTruth) return;
    setEditedGroundTruth({ ...editedGroundTruth, [field]: value });
  }

  // Which ground truth to display in the structured card
  const displayGroundTruth = editedGroundTruth || savedGroundTruth;

  // Whether structured fields should show provisional styling
  const isProvisional = phase === 1 && !!editedGroundTruth;

  // Whether the "Normalize Structure" button should show:
  // Phase 1 reflection has been accepted (savedGroundTruth was set from a Phase 1 result)
  // and we haven't yet run Phase 2
  const showNormalizeButton = phase === 1 && savedGroundTruth && !editedGroundTruth;

  if (loading) {
    return (
      <div className="space-y-8 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Candidate Profile</h1>
          <p className="text-muted-foreground mt-1">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Candidate Profile</h1>
        <p className="text-muted-foreground mt-1">
          Provide context about yourself that all AI functions will reference for disambiguation, tone calibration, and emphasis decisions.
        </p>
      </div>

      <div className="rounded-md border border-muted bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        This section is based on what you enter. The system will not verify facts. Later steps will avoid inventing metrics.
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Background</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Describe your professional background — role scope, team shape, responsibilities
          </Label>
          <Textarea
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            placeholder="e.g., I'm a Senior TPM at a Series B fintech startup managing a team of 8 engineers..."
            className="min-h-[120px]"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Proof Points</CardTitle>
        </CardHeader>
        <CardContent>
          <DynamicListInput
            label="Proof Points"
            items={proofPoints}
            onChange={setProofPoints}
            placeholder="e.g., Reduced onboarding time from 2 weeks to 3 days"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Hard metrics or outcome anchors the AI should prioritize
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Strengths</CardTitle>
        </CardHeader>
        <CardContent>
          <DynamicListInput
            label="Top Strengths"
            items={topStrengths}
            onChange={setTopStrengths}
            placeholder="e.g., Cross-functional program delivery"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Self-identified differentiators you want the AI to emphasize
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Constraints</CardTitle>
        </CardHeader>
        <CardContent>
          <DynamicListInput
            label="Constraints"
            items={constraints}
            onChange={setConstraints}
            placeholder="e.g., Don't claim direct people management experience"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Guardrails for rewrite behavior — things the AI should avoid
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferred Tone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Describe your preferred voice and style for rewrites
          </Label>
          <Input
            value={preferredTone}
            onChange={(e) => setPreferredTone(e.target.value)}
            placeholder="e.g., Direct and metrics-driven, avoid corporate jargon"
          />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </Button>
        <Button
          variant="outline"
          onClick={() => handleReviewProfile("default")}
          disabled={!background.trim() || refining}
        >
          {refining ? "Reviewing..." : "Review My Profile"}
        </Button>
        <Button
          variant="outline"
          onClick={() => handleReviewProfile("enrichment")}
          disabled={!background.trim() || refining}
        >
          {refining ? "Reviewing..." : "Deep Review"}
        </Button>
        {showNormalizeButton && (
          <Button
            variant="outline"
            onClick={() => handleReviewProfile("default", undefined, 2)}
            disabled={!background.trim() || refining}
          >
            {refining ? "Normalizing..." : "Normalize Structure"}
          </Button>
        )}
      </div>

      {displayGroundTruth && (
        <>
          <Separator />

          <Card>
            <CardHeader>
              <CardTitle>
                Ground Truth
                {isProvisional && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">(Phase 1 — Reflection)</span>
                )}
                {phase === 2 && editedGroundTruth && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">(Phase 2 — Normalized)</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Ground Truth Summary</Label>
                <Textarea
                  value={displayGroundTruth.groundTruthSummary}
                  onChange={(e) => updateGroundTruthField("groundTruthSummary", e.target.value)}
                  className="min-h-[120px]"
                  readOnly={!editedGroundTruth}
                />
              </div>

              <div className="space-y-2">
                <Label>Current Scope</Label>
                <Input
                  value={displayGroundTruth.currentScope}
                  onChange={(e) => updateGroundTruthField("currentScope", e.target.value)}
                  readOnly={!editedGroundTruth}
                />
              </div>

              <div className={isProvisional ? "opacity-60" : ""}>
                {isProvisional && (
                  <p className="text-xs text-muted-foreground italic mb-2">
                    Structured fields below are provisional — accept the reflection, then normalize for final extraction.
                  </p>
                )}

                <DynamicListInput
                  label="Systems Built"
                  items={displayGroundTruth.systemsBuilt}
                  onChange={(items) => updateGroundTruthField("systemsBuilt", items)}
                  max={10}
                  placeholder="e.g., Internal deployment pipeline"
                  readOnlyLabel={isProvisional ? "(provisional)" : undefined}
                />

                <div className="mt-4">
                  <DynamicListInput
                    label="Operating Model"
                    items={displayGroundTruth.operatingModel}
                    onChange={(items) => updateGroundTruthField("operatingModel", items)}
                    max={10}
                    placeholder="e.g., Cross-functional coordinator"
                    readOnlyLabel={isProvisional ? "(provisional)" : undefined}
                  />
                </div>

                <div className="mt-4">
                  <DynamicListInput
                    label="In-Progress Work"
                    items={displayGroundTruth.inProgressWork}
                    onChange={(items) => updateGroundTruthField("inProgressWork", items)}
                    max={10}
                    placeholder="e.g., Currently exploring observability tooling"
                    readOnlyLabel={isProvisional ? "(provisional)" : undefined}
                  />
                </div>

                <div className="mt-4">
                  <DynamicListInput
                    label="Next Planned Steps"
                    items={displayGroundTruth.nextPlannedSteps}
                    onChange={(items) => updateGroundTruthField("nextPlannedSteps", items)}
                    max={10}
                    placeholder="e.g., Plan to launch beta in Q2"
                    readOnlyLabel={isProvisional ? "(provisional)" : undefined}
                  />
                </div>
              </div>

              <DynamicListInput
                label="Proof Points"
                items={displayGroundTruth.proofPoints}
                onChange={(items) => updateGroundTruthField("proofPoints", items)}
                max={10}
                placeholder="e.g., Reduced deploy time by 40%"
                readOnlyLabel="from your explicit statements only"
              />

              {displayGroundTruth.openQuestionsOptional.length > 0 && (
                <div className="space-y-2">
                  <Label>Open Questions (optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Ambiguities noted during synthesis — these don&apos;t block anything
                  </p>
                  <div className="space-y-2">
                    {displayGroundTruth.openQuestionsOptional.map((q, i) => (
                      <div key={i} className="rounded-md border px-3 py-2 text-sm">
                        <p className="font-medium">{q.question}</p>
                        <p className="text-muted-foreground text-xs mt-1">{q.whyItMatters}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {editedGroundTruth && phase === 1 && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAcceptReflection}>
                    Accept Reflection
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (refinementResult) {
                        setEditedGroundTruth(refinementResult.groundTruth);
                      }
                    }}
                  >
                    Reset
                  </Button>
                </div>
              )}

              {editedGroundTruth && phase === 2 && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAcceptGroundTruth}>
                    Accept Ground Truth
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (refinementResult) {
                        setEditedGroundTruth(refinementResult.groundTruth);
                      }
                    }}
                  >
                    Reset
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <PromptLogViewer labels={["refine-profile", "normalize-profile"]} />

          {refinementResult && refinementResult.clarificationQuestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Clarification Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {refinementResult.clarificationQuestions.map((q) => (
                  <div key={q.id} className="space-y-1">
                    <Label>{q.question}</Label>
                    <p className="text-xs text-muted-foreground">{q.context}</p>
                    <Input
                      value={clarificationAnswers[q.id] || ""}
                      onChange={(e) =>
                        setClarificationAnswers((prev) => ({
                          ...prev,
                          [q.id]: e.target.value,
                        }))
                      }
                      placeholder="Your answer..."
                    />
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReviewProfile("enrichment", clarificationAnswers)}
                  disabled={refining}
                >
                  {refining ? "Re-running..." : "Re-run with Answers"}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
