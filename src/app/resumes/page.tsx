"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ResumeData {
  id: string;
  filename: string;
  fileType: string;
  targetCompany: string;
  targetRole: string;
  bulletCount: number;
  createdAt: string;
}

export default function ResumesPage() {
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ResumeData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCompany, setEditCompany] = useState("");
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    const res = await fetch("/api/resumes");
    const data = await res.json();
    setResumes(data);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/resumes/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete resume");
        return;
      }
      setResumes((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast.success("Resume deleted");
    } catch {
      toast.error("Failed to delete resume");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const startEditing = (resume: ResumeData) => {
    setEditingId(resume.id);
    setEditCompany(resume.targetCompany);
    setEditRole(resume.targetRole);
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/resumes/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetCompany: editCompany, targetRole: editRole }),
      });
      if (!res.ok) {
        toast.error("Failed to update");
        return;
      }
      setResumes((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? { ...r, targetCompany: editCompany, targetRole: editRole }
            : r
        )
      );
      toast.success("Updated");
      setEditingId(null);
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resumes</h1>
          <p className="text-muted-foreground mt-1">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Resumes</h1>
        <p className="text-muted-foreground mt-1">
          {resumes.length} uploaded resumes
        </p>
      </div>

      {resumes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No resumes uploaded yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            <Link href="/upload" className="text-primary hover:underline">
              Upload a resume
            </Link>{" "}
            to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {resumes.map((resume) => (
            <Card key={resume.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {resume.filename}
                    <Badge variant="secondary" className="text-xs">
                      {resume.fileType.toUpperCase()}
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" className="text-xs" asChild>
                      <Link href={`/bullets?resumeId=${resume.id}`}>
                        View Bullets
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(resume)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {editingId === resume.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Target Company"
                        value={editCompany}
                        onChange={(e) => setEditCompany(e.target.value)}
                      />
                      <Input
                        placeholder="Target Role"
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(null)}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {(resume.targetRole || resume.targetCompany) && (
                        <span className="text-foreground font-medium">
                          {[resume.targetRole, resume.targetCompany]
                            .filter(Boolean)
                            .join(" @ ")}
                        </span>
                      )}
                      <span>{resume.bulletCount} bullets</span>
                      <span>
                        Uploaded{" "}
                        {new Date(resume.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs"
                      onClick={() => startEditing(resume)}
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Resume</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.filename}
              &rdquo;? This will also permanently delete all{" "}
              {deleteTarget?.bulletCount} bullets extracted from this resume.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
