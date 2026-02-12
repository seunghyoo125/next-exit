"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { JDInterpretation, StrategyAssessment } from "@/types";
import PromptLogViewer from "./prompt-log-viewer";

interface SectionConfig {
  roleTitle: string;
  company: string;
  bulletCount: number;
}

interface FormatPreset {
  label: string;
  sections: SectionConfig[];
}

interface StepFormatProps {
  interpretation: JDInterpretation;
  strategyAssessment: StrategyAssessment | null;
  formatPresets: FormatPreset[];
  selectedPresetIndex: number | null;
  setSelectedPresetIndex: (idx: number | null) => void;
  formatSections: SectionConfig[];
  setFormatSections: (sections: SectionConfig[]) => void;
  formatRationale: string;
  setFormatRationale: (rationale: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export default function StepFormat({
  interpretation,
  strategyAssessment,
  formatPresets,
  selectedPresetIndex,
  setSelectedPresetIndex,
  formatSections,
  setFormatSections,
  formatRationale,
  setFormatRationale,
  onContinue,
  onBack,
}: StepFormatProps) {
  const [loading, setLoading] = useState(false);
  const [recommendedIndex, setRecommendedIndex] = useState<number | null>(null);
  const [useCustom, setUseCustom] = useState(false);
  const [customSections, setCustomSections] = useState<SectionConfig[]>([
    { roleTitle: "", company: "", bulletCount: 4 },
  ]);

  useEffect(() => {
    if (recommendedIndex === null && !formatRationale) {
      fetchRecommendation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRecommendation = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/builder/recommend-format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interpretation, strategyAssessment }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRecommendedIndex(data.recommendedIndex);
      setFormatRationale(data.rationale);

      // Auto-select recommended if nothing selected yet
      if (selectedPresetIndex === null) {
        setSelectedPresetIndex(data.recommendedIndex);
        setFormatSections(formatPresets[data.recommendedIndex].sections);
      }
    } catch {
      toast.error("Failed to get format recommendation");
    } finally {
      setLoading(false);
    }
  };

  const selectPreset = (idx: number) => {
    setSelectedPresetIndex(idx);
    setFormatSections(formatPresets[idx].sections);
    setUseCustom(false);
  };

  const switchToCustom = () => {
    setUseCustom(true);
    setSelectedPresetIndex(null);
    setFormatSections(customSections);
  };

  const updateCustomSection = (index: number, field: keyof SectionConfig, value: string | number) => {
    const updated = customSections.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    );
    setCustomSections(updated);
    setFormatSections(updated);
  };

  const addCustomSection = () => {
    const updated = [...customSections, { roleTitle: "", company: "", bulletCount: 4 }];
    setCustomSections(updated);
    setFormatSections(updated);
  };

  const removeCustomSection = (index: number) => {
    const updated = customSections.filter((_, i) => i !== index);
    setCustomSections(updated);
    setFormatSections(updated);
  };

  const canContinue = formatSections.length > 0 && formatSections.every(s => s.roleTitle && s.company);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Format Recommendation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && (
            <p className="text-sm text-muted-foreground">Getting AI format recommendation...</p>
          )}

          {formatRationale && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-sm text-blue-800 dark:text-blue-200">{formatRationale}</p>
            </div>
          )}

          {formatRationale && (
            <div className="flex items-center gap-2">
              <PromptLogViewer labels={["recommend-format"]} />
            </div>
          )}

          <div className="space-y-3">
            {formatPresets.map((preset, idx) => {
              const isRecommended = recommendedIndex === idx;
              const isSelected = selectedPresetIndex === idx && !useCustom;

              return (
                <div
                  key={preset.label}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => selectPreset(idx)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? "border-primary" : "border-muted-foreground/40"
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <span className="text-sm font-medium">{preset.label}</span>
                    {isRecommended && (
                      <Badge variant="default" className="text-xs">
                        AI Recommended
                      </Badge>
                    )}
                  </div>
                  <div className="ml-6 mt-1 text-xs text-muted-foreground">
                    {preset.sections.map((s) => `${s.roleTitle} (${s.bulletCount})`).join(" + ")}
                  </div>
                </div>
              );
            })}

            {/* Custom option */}
            <div
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                useCustom ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
              onClick={switchToCustom}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    useCustom ? "border-primary" : "border-muted-foreground/40"
                  }`}
                >
                  {useCustom && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <span className="text-sm font-medium">Custom Format</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom section editor */}
      {useCustom && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custom Sections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customSections.map((section, idx) => (
              <div key={idx} className="flex items-end gap-3">
                <div className="flex-1">
                  <Label>Role Title</Label>
                  <Input
                    placeholder="e.g., Senior Associate"
                    value={section.roleTitle}
                    onChange={(e) => updateCustomSection(idx, "roleTitle", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex-1">
                  <Label>Company</Label>
                  <Input
                    placeholder="e.g., PwC"
                    value={section.company}
                    onChange={(e) => updateCustomSection(idx, "company", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="w-24">
                  <Label>Bullets</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={section.bulletCount}
                    onChange={(e) => updateCustomSection(idx, "bulletCount", parseInt(e.target.value) || 1)}
                    className="mt-1"
                  />
                </div>
                {customSections.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCustomSection(idx)}
                    className="text-destructive hover:text-destructive mb-0.5"
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addCustomSection}>
              + Add Section
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back to Strategy
        </Button>
        <Button onClick={onContinue} disabled={!canContinue}>
          Continue to Bullet Selection
        </Button>
      </div>
    </div>
  );
}
