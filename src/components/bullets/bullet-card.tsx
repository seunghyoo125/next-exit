"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface BulletData {
  id: string;
  content: string;
  section: string;
  company: string;
  roleTitle: string;
  category: string;
  roleLevel: string;
  theme: string;
  targetCompany?: string;
  targetRole?: string;
}

interface BulletCardProps {
  bullet: BulletData;
  themeSuggestions: string[];
  onUpdate: (bullet: BulletData) => void;
  onDelete: (id: string) => void;
}

export function BulletCard({
  bullet,
  themeSuggestions,
  onUpdate,
  onDelete,
}: BulletCardProps) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(bullet.content);
  const [roleLevel, setRoleLevel] = useState(bullet.roleLevel);
  const [theme, setTheme] = useState(bullet.theme);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/bullets/${bullet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, roleLevel, theme }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json();
      onUpdate({ ...bullet, ...updated });
      setEditing(false);
      toast.success("Bullet updated");
    } catch {
      toast.error("Failed to update bullet");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/bullets/${bullet.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      onDelete(bullet.id);
      toast.success("Bullet deleted");
    } catch {
      toast.error("Failed to delete bullet");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(bullet.content);
    toast.success("Copied to clipboard");
  };

  return (
    <Card className="group">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <span className="font-medium">{bullet.roleTitle}</span>
              <span>@</span>
              <span>{bullet.company}</span>
              {(bullet.targetRole || bullet.targetCompany) && (
                <>
                  <span className="text-border">|</span>
                  <span className="text-primary font-medium">
                    {[bullet.targetRole, bullet.targetCompany]
                      .filter(Boolean)
                      .join(" @ ")}
                  </span>
                </>
              )}
              {bullet.category && bullet.category !== "experience" && (
                <>
                  <span className="text-border">|</span>
                  <span className="text-orange-500">{bullet.category}</span>
                </>
              )}
            </div>

            {editing ? (
              <div className="space-y-3">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[80px] text-sm"
                />
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Role Level
                  </label>
                  <Select value={roleLevel || "none"} onValueChange={(v) => setRoleLevel(v === "none" ? "" : v)}>
                    <SelectTrigger className="w-[180px] h-9">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="sa">SA</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Theme
                  </label>
                  <Input
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="e.g., Internal AI Tooling"
                    className="h-9"
                    list="theme-suggestions"
                  />
                  <datalist id="theme-suggestions">
                    {themeSuggestions.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      setContent(bullet.content);
                      setRoleLevel(bullet.roleLevel);
                      setTheme(bullet.theme);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-relaxed">{bullet.content}</p>
            )}
          </div>

          {!editing && (
            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="sm" variant="ghost" onClick={handleCopy} className="h-7 text-xs">
                Copy
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="h-7 text-xs">
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                className="h-7 text-xs text-destructive hover:text-destructive"
              >
                Delete
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
