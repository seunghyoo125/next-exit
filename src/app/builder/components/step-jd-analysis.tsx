"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { JDInterpretation } from "@/types";
import PromptLogViewer from "./prompt-log-viewer";

interface StepJDAnalysisProps {
  title: string;
  setTitle: (title: string) => void;
  jobDescription: string;
  setJobDescription: (jd: string) => void;
  interpretation: JDInterpretation | null;
  setInterpretation: (interp: JDInterpretation | null) => void;
  onContinue: () => void;
  onTitleChange?: (title: string) => void;
  onJDChange?: (jd: string) => void;
}

export default function StepJDAnalysis({
  title,
  setTitle,
  jobDescription,
  setJobDescription,
  interpretation,
  setInterpretation,
  onContinue,
  onTitleChange,
  onJDChange,
}: StepJDAnalysisProps) {
  const [interpreting, setInterpreting] = useState(false);
  const [editingInterpretation, setEditingInterpretation] = useState(false);

  const analyzeJD = async () => {
    if (!jobDescription.trim()) {
      toast.error("Please paste a job description first");
      return;
    }

    setInterpreting(true);
    try {
      const res = await fetch("/api/builder/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription }),
      });
      if (!res.ok) throw new Error("Failed to analyze JD");
      const data: JDInterpretation = await res.json();
      setInterpretation(data);
      setEditingInterpretation(false);
      toast.success("JD analysis complete");
    } catch {
      toast.error("Failed to analyze job description");
    } finally {
      setInterpreting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Job Description</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Build Title</Label>
            <Input
              id="title"
              placeholder="e.g., Google TPM Application"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                onTitleChange?.(e.target.value);
              }}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="jd">Paste Job Description</Label>
            <Textarea
              id="jd"
              placeholder="Paste the full job description here..."
              value={jobDescription}
              onChange={(e) => {
                setJobDescription(e.target.value);
                onJDChange?.(e.target.value);
                if (interpretation) {
                  setInterpretation(null);
                }
              }}
              className="mt-1 min-h-[150px]"
            />
          </div>
          <Button
            onClick={analyzeJD}
            disabled={interpreting || !jobDescription.trim()}
          >
            {interpreting
              ? "Analyzing job description..."
              : interpretation
              ? "Re-analyze JD"
              : "Analyze JD"}
          </Button>
        </CardContent>
      </Card>

      {interpretation && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>JD Interpretation</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingInterpretation(!editingInterpretation)}
              >
                {editingInterpretation ? "Done Editing" : "Edit"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Role Summary</Label>
              {editingInterpretation ? (
                <div className="space-y-2 mt-1">
                  {interpretation.roleSummary.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={item}
                        onChange={(e) => {
                          const updated = [...interpretation.roleSummary];
                          updated[i] = e.target.value;
                          setInterpretation({ ...interpretation, roleSummary: updated });
                        }}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => {
                          const updated = interpretation.roleSummary.filter((_, idx) => idx !== i);
                          setInterpretation({ ...interpretation, roleSummary: updated });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setInterpretation({
                        ...interpretation,
                        roleSummary: [...interpretation.roleSummary, ""],
                      })
                    }
                  >
                    + Add
                  </Button>
                </div>
              ) : (
                <ul className="space-y-1.5 mt-1">
                  {interpretation.roleSummary.map((item, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-muted-foreground mt-0.5">&#x2022;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Core Responsibilities</Label>
              {editingInterpretation ? (
                <div className="space-y-2 mt-1">
                  {interpretation.coreResponsibilities.map((resp, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={resp}
                        onChange={(e) => {
                          const updated = [...interpretation.coreResponsibilities];
                          updated[i] = e.target.value;
                          setInterpretation({ ...interpretation, coreResponsibilities: updated });
                        }}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => {
                          const updated = interpretation.coreResponsibilities.filter((_, idx) => idx !== i);
                          setInterpretation({ ...interpretation, coreResponsibilities: updated });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setInterpretation({
                        ...interpretation,
                        coreResponsibilities: [...interpretation.coreResponsibilities, ""],
                      })
                    }
                  >
                    + Add
                  </Button>
                </div>
              ) : (
                <ol className="list-decimal list-inside text-sm mt-1 space-y-0.5">
                  {interpretation.coreResponsibilities.map((resp, i) => (
                    <li key={i}>{resp}</li>
                  ))}
                </ol>
              )}
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Real Skills</Label>
              {editingInterpretation ? (
                <div className="space-y-2 mt-1">
                  {interpretation.realSkills.map((skill, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={skill}
                        onChange={(e) => {
                          const updated = [...interpretation.realSkills];
                          updated[i] = e.target.value;
                          setInterpretation({ ...interpretation, realSkills: updated });
                        }}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => {
                          const updated = interpretation.realSkills.filter((_, idx) => idx !== i);
                          setInterpretation({ ...interpretation, realSkills: updated });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setInterpretation({
                        ...interpretation,
                        realSkills: [...interpretation.realSkills, ""],
                      })
                    }
                  >
                    + Add
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {interpretation.realSkills.map((skill, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Seniority Level</Label>
              {editingInterpretation ? (
                <Input
                  value={interpretation.seniorityLevel}
                  onChange={(e) =>
                    setInterpretation({ ...interpretation, seniorityLevel: e.target.value })
                  }
                  className="mt-1"
                />
              ) : (
                <p className="text-sm mt-1 font-medium">{interpretation.seniorityLevel}</p>
              )}
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Misleading Signals</Label>
              <div className="space-y-2 mt-1">
                {interpretation.misleadingSignals.map((signal, i) => (
                  <div
                    key={i}
                    className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md"
                  >
                    {editingInterpretation ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={signal.signal}
                            onChange={(e) => {
                              const updated = [...interpretation.misleadingSignals];
                              updated[i] = { ...updated[i], signal: e.target.value };
                              setInterpretation({ ...interpretation, misleadingSignals: updated });
                            }}
                            placeholder="Signal"
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => {
                              const updated = interpretation.misleadingSignals.filter((_, idx) => idx !== i);
                              setInterpretation({ ...interpretation, misleadingSignals: updated });
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                        <Input
                          value={signal.reality}
                          onChange={(e) => {
                            const updated = [...interpretation.misleadingSignals];
                            updated[i] = { ...updated[i], reality: e.target.value };
                            setInterpretation({ ...interpretation, misleadingSignals: updated });
                          }}
                          placeholder="Reality"
                        />
                      </div>
                    ) : (
                      <div className="text-sm">
                        <span className="font-medium text-amber-800 dark:text-amber-200">
                          &quot;{signal.signal}&quot;
                        </span>
                        <span className="text-amber-700 dark:text-amber-300"> → </span>
                        <span className="text-amber-700 dark:text-amber-300">{signal.reality}</span>
                      </div>
                    )}
                  </div>
                ))}
                {editingInterpretation && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setInterpretation({
                        ...interpretation,
                        misleadingSignals: [
                          ...interpretation.misleadingSignals,
                          { signal: "", reality: "" },
                        ],
                      })
                    }
                  >
                    + Add Signal
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Match Guidance</Label>
              {editingInterpretation ? (
                <div className="space-y-2 mt-1">
                  {interpretation.matchGuidance.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={item}
                        onChange={(e) => {
                          const updated = [...interpretation.matchGuidance];
                          updated[i] = e.target.value;
                          setInterpretation({ ...interpretation, matchGuidance: updated });
                        }}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => {
                          const updated = interpretation.matchGuidance.filter((_, idx) => idx !== i);
                          setInterpretation({ ...interpretation, matchGuidance: updated });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setInterpretation({
                        ...interpretation,
                        matchGuidance: [...interpretation.matchGuidance, ""],
                      })
                    }
                  >
                    + Add
                  </Button>
                </div>
              ) : (
                <div className="mt-1 p-2.5 border rounded-md bg-muted/30">
                  <ul className="space-y-1.5">
                    {interpretation.matchGuidance.map((item, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-muted-foreground mt-0.5">&#x2022;</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {interpretation && (
        <div className="flex items-center gap-2">
          <PromptLogViewer labels={["interpret-jd"]} />
        </div>
      )}

      {interpretation && (
        <div className="flex justify-end">
          <Button onClick={onContinue}>Continue to Strategy Assessment</Button>
        </div>
      )}
    </div>
  );
}
