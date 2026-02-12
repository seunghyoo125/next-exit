"use client";

import { useState, useEffect, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";

interface BuiltResumeBullet {
  id: string;
  sortOrder: number;
  finalText: string;
  reviewVerdict: string;
  reviewFeedback: string;
  suggestedText: string;
  userDecision: string;
  bullet: {
    id: string;
    content: string;
    company: string;
    roleTitle: string;
    theme: string;
    roleLevel: string;
  };
}

interface BuiltResumeSection {
  id: string;
  roleTitle: string;
  company: string;
  bulletCount: number;
  sortOrder: number;
  bullets: BuiltResumeBullet[];
}

interface BuiltResume {
  id: string;
  title: string;
  jobDescription: string;
  status: string;
  currentStep: number;
  createdAt: string;
  sections: BuiltResumeSection[];
}

export default function BuiltResumePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [resume, setResume] = useState<BuiltResume | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/builder/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setResume(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const getBulletText = (b: BuiltResumeBullet) => {
    // Prefer finalText (from review flow), fall back to original
    return b.finalText || b.bullet.content;
  };

  const copyAll = () => {
    if (!resume) return;
    const text = resume.sections
      .map((section) => {
        const header = `${section.roleTitle} @ ${section.company}`;
        const bullets = section.bullets
          .map((b) => `  - ${getBulletText(b)}`)
          .join("\n");
        return `${header}\n${bullets}`;
      })
      .join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Copied all bullets!");
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  if (!resume) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Build not found.</p>
        <Link href="/builder" className="underline text-sm mt-2 block">
          Back to builder
        </Link>
      </div>
    );
  }

  const isDraft = resume.status === "draft";

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{resume.title}</h1>
            {isDraft && (
              <Badge variant="outline" className="text-xs">
                Draft
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Built on {new Date(resume.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="default" size="sm" asChild>
            <Link href={`/builder?draft=${resume.id}`}>
              {isDraft ? "Continue Editing" : "Edit Build"}
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={copyAll}>
            Copy All
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/builder">New Build</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">
            {resume.jobDescription}
          </p>
        </CardContent>
      </Card>

      {resume.sections.map((section) => (
        <Card key={section.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {section.roleTitle} @ {section.company}
              <span className="text-xs font-normal text-muted-foreground ml-2">
                ({section.bullets.length} bullets)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {section.bullets.map((b) => {
                const hasFinalText = b.finalText && b.finalText !== b.bullet.content;
                const verdictStyles: Record<string, string> = {
                  good: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-700",
                  tone: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700",
                  enhance: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700",
                };

                return (
                  <div
                    key={b.id}
                    className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{getBulletText(b)}</p>
                      {hasFinalText && (
                        <p className="text-xs text-muted-foreground mt-1 line-through">
                          Original: {b.bullet.content}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {b.reviewVerdict && (
                          <Badge
                            className={`text-xs ${verdictStyles[b.reviewVerdict] || ""}`}
                            variant="outline"
                          >
                            {b.reviewVerdict}
                          </Badge>
                        )}
                        {b.bullet.theme && (
                          <Badge variant="secondary" className="text-xs">
                            {b.bullet.theme}
                          </Badge>
                        )}
                        {b.bullet.roleLevel && (
                          <Badge variant="outline" className="text-xs">
                            {b.bullet.roleLevel}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        navigator.clipboard.writeText(getBulletText(b));
                        toast.success("Copied!");
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
