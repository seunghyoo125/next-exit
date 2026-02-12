"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import Link from "next/link";
import {
  RoleInput,
  RoleComparisonResult,
  SectionRecommendation,
} from "@/types";

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
      { roleTitle: "Partnership", company: "", bulletCount: 1 },
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

export default function RoleComparisonMode() {
  const [title, setTitle] = useState("");
  const [sections, setSections] = useState<SectionConfig[]>([
    { roleTitle: "", company: "", bulletCount: 4 },
  ]);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const [selectedPresets, setSelectedPresets] = useState<Set<number>>(new Set());
  const [recommendedPresetIndex, setRecommendedPresetIndex] = useState<number | null>(null);
  const [hasManuallySelectedPreset, setHasManuallySelectedPreset] = useState(false);

  const [roleInputs, setRoleInputs] = useState<RoleInput[]>([
    { label: "", jobDescription: "" },
    { label: "", jobDescription: "" },
  ]);
  const [roleComparisonResult, setRoleComparisonResult] = useState<RoleComparisonResult | null>(null);
  const [roleComparisonLoading, setRoleComparisonLoading] = useState(false);
  const [roleActiveTab, setRoleActiveTab] = useState("summary");
  const [roleSelections, setRoleSelections] = useState<Record<string, SectionWithSelections[]>>({});

  const fetchBulletStats = useCallback(async () => {
    try {
      const res = await fetch("/api/builder/bullet-stats");
      if (!res.ok) return;
      const stats: { manager: number; sa: number; partnership: number } = await res.json();
      let recommended: number;
      if (stats.partnership > 0) {
        recommended = 0;
      } else if (stats.manager >= 8) {
        recommended = 2;
      } else {
        recommended = 1;
      }
      setRecommendedPresetIndex(recommended);
      if (!hasManuallySelectedPreset) {
        setSelectedPresets(new Set([recommended]));
      }
    } catch {
      // Silently fail
    }
  }, [hasManuallySelectedPreset]);

  useEffect(() => {
    fetchBulletStats();
  }, [fetchBulletStats]);

  const togglePreset = (index: number) => {
    setHasManuallySelectedPreset(true);
    setSelectedPresets((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const addSection = () => {
    setSections((prev) => [...prev, { roleTitle: "", company: "", bulletCount: 4 }]);
  };

  const removeSection = (index: number) => {
    setSections((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSection = (index: number, field: keyof SectionConfig, value: string | number) => {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const updateRoleInput = (index: number, field: keyof RoleInput, value: string) => {
    setRoleInputs((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  const addRoleInput = () => {
    if (roleInputs.length >= 3) return;
    setRoleInputs((prev) => [...prev, { label: "", jobDescription: "" }]);
  };

  const removeRoleInput = (index: number) => {
    if (roleInputs.length <= 2) return;
    setRoleInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleBulletInResults = (
    resultsList: SectionWithSelections[],
    sectionIndex: number,
    bulletId: string
  ): SectionWithSelections[] => {
    return resultsList.map((s, i) => {
      if (i !== sectionIndex) return s;
      const selected = s.selectedBulletIds.includes(bulletId)
        ? s.selectedBulletIds.filter((id) => id !== bulletId)
        : [...s.selectedBulletIds, bulletId];
      return { ...s, selectedBulletIds: selected };
    });
  };

  const toggleBullet = (sectionIndex: number, bulletId: string) => {
    if (roleActiveTab !== "summary") {
      setRoleSelections((prev) => {
        const current = prev[roleActiveTab];
        if (!current) return prev;
        return {
          ...prev,
          [roleActiveTab]: toggleBulletInResults(current, sectionIndex, bulletId),
        };
      });
    }
  };

  const compareRolesAction = async () => {
    for (const role of roleInputs) {
      if (!role.label.trim() || !role.jobDescription.trim()) {
        toast.error("Please fill in all role labels and job descriptions");
        return;
      }
    }

    let targetSections: SectionConfig[];
    if (selectedPresets.size >= 1) {
      targetSections = FORMAT_PRESETS[Array.from(selectedPresets)[0]].sections;
    } else {
      targetSections = sections;
      if (targetSections.some((s) => !s.roleTitle || !s.company)) {
        toast.error("Please fill in all section fields or select a format preset");
        return;
      }
    }

    setRoleComparisonLoading(true);
    setRoleComparisonResult(null);
    setSavedId(null);

    try {
      const res = await fetch("/api/builder/compare-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roles: roleInputs.map((r) => ({
            label: r.label,
            jobDescription: r.jobDescription,
          })),
          sections: targetSections,
        }),
      });

      if (!res.ok) throw new Error("Failed to compare roles");
      const data: RoleComparisonResult = await res.json();
      setRoleComparisonResult(data);

      const selections: Record<string, SectionWithSelections[]> = {};
      for (const role of roleInputs) {
        const recs = data.roleResults[role.label] || [];
        selections[role.label] = targetSections.map((s, i) => ({
          ...s,
          recommendations: recs[i]?.recommendations || [],
          selectedBulletIds: (recs[i]?.recommendations || [])
            .slice(0, s.bulletCount)
            .map((r) => r.bulletId),
          formatSuggestion: recs[i]?.formatSuggestion,
        }));
      }
      setRoleSelections(selections);
      setRoleActiveTab("summary");
      toast.success("Role comparison complete");
    } catch {
      toast.error("Failed to compare roles");
    } finally {
      setRoleComparisonLoading(false);
    }
  };

  const handleSave = async () => {
    const activeResultsList = roleSelections[roleActiveTab] || null;
    if (!activeResultsList || !title.trim()) {
      toast.error("Please enter a title and select a role tab to save");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          jobDescription:
            roleInputs.find((r) => r.label === roleActiveTab)?.jobDescription || "",
          sections: activeResultsList.map((s) => ({
            roleTitle: s.roleTitle,
            company: s.company,
            bulletCount: s.bulletCount,
            bulletIds: s.selectedBulletIds,
          })),
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

  const copyAllSelected = () => {
    const activeResultsList = roleSelections[roleActiveTab] || null;
    if (!activeResultsList) return;
    const text = activeResultsList
      .map((section) => {
        const header = `${section.roleTitle} @ ${section.company}`;
        const bullets = section.selectedBulletIds
          .map((id) => {
            const rec = section.recommendations.find((r) => r.bulletId === id);
            return rec ? `  - ${rec.content}` : null;
          })
          .filter(Boolean)
          .join("\n");
        return `${header}\n${bullets}`;
      })
      .join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Copied all selected bullets!");
  };

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

  const renderRecommendations = (resultsList: SectionWithSelections[]) => {
    const grouped = groupResults(resultsList);

    return (
      <div className="space-y-4">
        {grouped.map((group, gIdx) => (
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
                                isSelected
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground/40"
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
                              <Badge variant="outline" className="text-xs">
                                Score: {rec.score}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{rec.reason}</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(rec.content);
                              toast.success("Copied!");
                            }}
                          >
                            Copy
                          </Button>
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
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Build Title</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="e.g., TPM vs PM Role Comparison"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Job Descriptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {roleInputs.map((role, idx) => (
            <div key={idx} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-medium">Role {idx + 1}</Label>
                {roleInputs.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeRoleInput(idx)}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <div>
                <Label htmlFor={`role-label-${idx}`} className="text-xs text-muted-foreground">Label</Label>
                <Input
                  id={`role-label-${idx}`}
                  placeholder="e.g., Google TPM"
                  value={role.label}
                  onChange={(e) => updateRoleInput(idx, "label", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={`role-jd-${idx}`} className="text-xs text-muted-foreground">Job Description</Label>
                <Textarea
                  id={`role-jd-${idx}`}
                  placeholder="Paste the full job description here..."
                  value={role.jobDescription}
                  onChange={(e) => updateRoleInput(idx, "jobDescription", e.target.value)}
                  className="mt-1 min-h-[120px]"
                />
              </div>
            </div>
          ))}
          {roleInputs.length < 3 && (
            <Button variant="outline" size="sm" onClick={addRoleInput}>
              + Add Role (max 3)
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resume Sections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Format Presets</Label>
            <div className="space-y-2 mt-1">
              {FORMAT_PRESETS.map((preset, idx) => (
                <label key={preset.label} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedPresets.has(idx)}
                    onCheckedChange={() => togglePreset(idx)}
                  />
                  <span className="text-sm">
                    {preset.label}
                    {recommendedPresetIndex === idx && (
                      <span className="text-xs text-primary font-medium ml-1">— Recommended</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
            {selectedPresets.size >= 1 && (
              <p className="text-xs text-muted-foreground mt-1">
                For role comparison, only one format is used (first selected preset).
              </p>
            )}
          </div>

          {selectedPresets.size === 0 && (
            <>
              {sections.map((section, idx) => (
                <div key={idx} className="flex items-end gap-3">
                  <div className="flex-1">
                    <Label>Role Title</Label>
                    <Input
                      placeholder="e.g., Senior Associate"
                      value={section.roleTitle}
                      onChange={(e) => updateSection(idx, "roleTitle", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex-1">
                    <Label>Company</Label>
                    <Input
                      placeholder="e.g., PwC"
                      value={section.company}
                      onChange={(e) => updateSection(idx, "company", e.target.value)}
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
                      onChange={(e) => updateSection(idx, "bulletCount", parseInt(e.target.value) || 1)}
                      className="mt-1"
                    />
                  </div>
                  {sections.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSection(idx)}
                      className="text-destructive hover:text-destructive mb-0.5"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addSection}>
                + Add Section
              </Button>
            </>
          )}

          <div>
            <Button onClick={compareRolesAction} disabled={roleComparisonLoading}>
              {roleComparisonLoading ? "Comparing Roles..." : "Compare Roles"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {roleComparisonResult && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Role Comparison Results</h2>
            {roleActiveTab !== "summary" && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyAllSelected}>
                  Copy All Selected
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Build"}
                </Button>
              </div>
            )}
          </div>

          {savedId && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              Saved!{" "}
              <Link href={`/builder/${savedId}`} className="underline font-medium">
                View saved build
              </Link>
            </div>
          )}

          <Tabs value={roleActiveTab} onValueChange={setRoleActiveTab}>
            <TabsList>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              {roleInputs.map((role) => (
                <TabsTrigger key={role.label} value={role.label}>
                  {role.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="summary">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Role Rankings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {roleComparisonResult.summary.rankings.map((role, idx) => (
                      <div key={role.label} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className="text-2xl font-bold text-muted-foreground w-8 text-center">{idx + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{role.label}</span>
                            <Badge
                              className={`text-xs ${
                                role.fitLevel === "strong"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-700"
                                  : role.fitLevel === "stretch"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700"
                                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700"
                              }`}
                              variant="outline"
                            >
                              {role.fitLevel}
                            </Badge>
                            <Badge variant={idx === 0 ? "default" : "secondary"}>{role.fitScore}/100</Badge>
                          </div>
                          <Progress value={role.fitScore} className="h-2 mb-2" />
                          <div className="flex flex-wrap gap-1">
                            {role.matchedSkills.slice(0, 4).map((skill, sIdx) => (
                              <Badge key={sIdx} variant="outline" className="text-xs">{skill}</Badge>
                            ))}
                            {role.matchedSkills.length > 4 && (
                              <Badge variant="outline" className="text-xs">+{role.matchedSkills.length - 4} more</Badge>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setRoleActiveTab(role.label)}>
                          View Details
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Strategic Recommendation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed">{roleComparisonResult.summary.overallRecommendation}</p>
                  </CardContent>
                </Card>

                {roleComparisonResult.summary.executionPlan && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Execution Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed whitespace-pre-line">{roleComparisonResult.summary.executionPlan}</p>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Common Strengths</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1.5">
                        {roleComparisonResult.summary.commonStrengths.map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                        {roleComparisonResult.summary.commonStrengths.length === 0 && (
                          <p className="text-sm text-muted-foreground">None identified</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Universal Gaps</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1.5">
                        {roleComparisonResult.summary.universalGaps.map((g, i) => (
                          <Badge key={i} variant="destructive" className="text-xs">{g}</Badge>
                        ))}
                        {roleComparisonResult.summary.universalGaps.length === 0 && (
                          <p className="text-sm text-muted-foreground">None identified</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {roleInputs.map((role) => {
              const assessment = roleComparisonResult.summary.rankings.find((r) => r.label === role.label);
              const interp = roleComparisonResult.interpretations[role.label];
              const selectionsForRole = roleSelections[role.label];

              return (
                <TabsContent key={role.label} value={role.label}>
                  <div className="space-y-4">
                    {assessment && (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg font-semibold">{role.label}</span>
                            <Badge
                              className={`text-xs ${
                                assessment.fitLevel === "strong"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-700"
                                  : assessment.fitLevel === "stretch"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700"
                                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700"
                              }`}
                              variant="outline"
                            >
                              {assessment.fitLevel}
                            </Badge>
                            <Badge variant="secondary">{assessment.fitScore}/100</Badge>
                          </div>
                          <Progress value={assessment.fitScore} className="h-2" />
                        </CardContent>
                      </Card>
                    )}

                    {assessment && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Gap Areas</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-1">
                              {assessment.gapAreas.map((gap, i) => (
                                <li key={i} className="text-sm flex items-start gap-2">
                                  <span className="text-destructive mt-0.5">&#x2022;</span>
                                  {gap}
                                </li>
                              ))}
                              {assessment.gapAreas.length === 0 && (
                                <li className="text-sm text-muted-foreground">None identified</li>
                              )}
                            </ul>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Reframing Advice</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-1.5">
                              {assessment.reframingAdvice.map((advice, i) => (
                                <li key={i} className="text-sm flex items-start gap-2">
                                  <span className="text-primary mt-0.5">&#x2022;</span>
                                  {advice}
                                </li>
                              ))}
                              {assessment.reframingAdvice.length === 0 && (
                                <li className="text-sm text-muted-foreground">None identified</li>
                              )}
                            </ul>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {assessment && assessment.topFivePercentPath && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Top 5% Path</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm leading-relaxed">{assessment.topFivePercentPath}</p>
                        </CardContent>
                      </Card>
                    )}

                    {interp && (
                      <details className="border rounded-lg">
                        <summary className="p-4 cursor-pointer font-medium text-sm hover:bg-muted/50">
                          JD Interpretation
                        </summary>
                        <div className="p-4 pt-0 space-y-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">Role Summary</Label>
                            <ul className="space-y-1.5 mt-1">
                              {interp.roleSummary.map((item, i) => (
                                <li key={i} className="text-sm flex items-start gap-2">
                                  <span className="text-muted-foreground mt-0.5">&#x2022;</span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Core Responsibilities</Label>
                            <ol className="list-decimal list-inside text-sm mt-1 space-y-0.5">
                              {interp.coreResponsibilities.map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ol>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Real Skills</Label>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {interp.realSkills.map((s, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Seniority</Label>
                            <p className="text-sm mt-1 font-medium">{interp.seniorityLevel}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Match Guidance</Label>
                            <div className="mt-1 p-2.5 border rounded-md bg-muted/30">
                              <ul className="space-y-1.5">
                                {interp.matchGuidance.map((item, i) => (
                                  <li key={i} className="text-sm flex items-start gap-2">
                                    <span className="text-muted-foreground mt-0.5">&#x2022;</span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </details>
                    )}

                    {selectionsForRole && renderRecommendations(selectionsForRole)}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </>
      )}
    </>
  );
}
