"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

type UploadStatus = "idle" | "uploading" | "parsing" | "tagging" | "grouping" | "done" | "error";

const statusMessages: Record<UploadStatus, string> = {
  idle: "Drop a resume file or click to browse",
  uploading: "Uploading file...",
  parsing: "Extracting bullets with AI...",
  tagging: "Tagging bullets with themes and role types...",
  grouping: "Grouping similar bullets...",
  done: "Upload complete!",
  error: "Something went wrong",
};

const statusProgress: Record<UploadStatus, number> = {
  idle: 0,
  uploading: 10,
  parsing: 30,
  tagging: 60,
  grouping: 80,
  done: 100,
  error: 0,
};

export default function UploadPage() {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{ bulletCount: number; filename: string } | null>(null);
  const [targetCompany, setTargetCompany] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleUpload = useCallback(async (file: File, company: string, role: string) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "docx") {
      toast.error("Please upload a PDF or DOCX file");
      return;
    }

    setStatus("uploading");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("targetCompany", company);
      formData.append("targetRole", role);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      // Stream status updates via response
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Upload failed");
      }

      const data = await response.json();
      setStatus("done");
      setResult({ bulletCount: data.bulletCount, filename: file.name });
      toast.success(`Extracted ${data.bulletCount} bullets from ${file.name}`);
    } catch (err) {
      setStatus("error");
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) setPendingFile(file);
    },
    []
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) setPendingFile(file);
    },
    []
  );

  const handleSubmit = useCallback(() => {
    if (!pendingFile) return;
    handleUpload(pendingFile, targetCompany, targetRole);
  }, [pendingFile, targetCompany, targetRole, handleUpload]);

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload Resume</h1>
        <p className="text-muted-foreground mt-1">
          Upload a PDF or DOCX resume to extract and tag bullets
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".pdf,.docx"
              onChange={handleChange}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </svg>
              <p className="text-sm font-medium">
                {pendingFile && status === "idle"
                  ? pendingFile.name
                  : statusMessages[status]}
              </p>
              <p className="text-xs text-muted-foreground">
                {pendingFile && status === "idle"
                  ? "Click to change file"
                  : "Supports PDF and DOCX"}
              </p>
            </div>
          </div>

          {pendingFile && status === "idle" && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetCompany">Target Company</Label>
                  <Input
                    id="targetCompany"
                    placeholder="e.g. Chime, MongoDB"
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetRole">Target Role</Label>
                  <Input
                    id="targetRole"
                    placeholder="e.g. PM, Internal AI"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleSubmit} className="w-full">
                Upload & Extract Bullets
              </Button>
            </div>
          )}

          {status !== "idle" && (
            <div className="mt-6 space-y-3">
              <Progress value={statusProgress[status]} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                {statusMessages[status]}
              </p>
            </div>
          )}

          {result && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium">
                Successfully extracted {result.bulletCount} bullets from{" "}
                <span className="font-bold">{result.filename}</span>
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatus("idle");
                    setResult(null);
                    setPendingFile(null);
                    setTargetCompany("");
                    setTargetRole("");
                  }}
                >
                  Upload Another
                </Button>
                <Button size="sm" asChild>
                  <a href="/bullets">View Bullets</a>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
