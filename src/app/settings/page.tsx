"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Provider = "anthropic" | "openai";

export default function SettingsPage() {
  const [provider, setProvider] = useState<Provider>("anthropic");
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [hasAnthropicApiKey, setHasAnthropicApiKey] = useState(false);
  const [hasOpenaiApiKey, setHasOpenaiApiKey] = useState(false);
  const [anthropicKeyHint, setAnthropicKeyHint] = useState("");
  const [openaiKeyHint, setOpenaiKeyHint] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setProvider(data.provider || "anthropic");
        setHasAnthropicApiKey(Boolean(data.hasAnthropicApiKey));
        setHasOpenaiApiKey(Boolean(data.hasOpenaiApiKey));
        setAnthropicKeyHint(data.anthropicKeyHint || "");
        setOpenaiKeyHint(data.openaiKeyHint || "");
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          ...(anthropicApiKey.trim() ? { anthropicApiKey: anthropicApiKey.trim() } : {}),
          ...(openaiApiKey.trim() ? { openaiApiKey: openaiApiKey.trim() } : {}),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      if (anthropicApiKey.trim()) {
        setAnthropicApiKey("");
        setHasAnthropicApiKey(true);
      }
      if (openaiApiKey.trim()) {
        setOpenaiApiKey("");
        setHasOpenaiApiKey(true);
      }
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-8 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your AI provider and API keys
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI Provider</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Provider</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="provider"
                  value="anthropic"
                  checked={provider === "anthropic"}
                  onChange={() => setProvider("anthropic")}
                  className="accent-primary"
                />
                <span className="text-sm font-medium">Anthropic (Claude)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="provider"
                  value="openai"
                  checked={provider === "openai"}
                  onChange={() => setProvider("openai")}
                  className="accent-primary"
                />
                <span className="text-sm font-medium">OpenAI (o3)</span>
              </label>
            </div>
          </div>

          {provider === "anthropic" && (
            <div className="space-y-2">
              <Label htmlFor="anthropic-key">Anthropic API Key</Label>
              <Input
                id="anthropic-key"
                type="password"
                placeholder="sk-ant-..."
                value={anthropicApiKey}
                onChange={(e) => setAnthropicApiKey(e.target.value)}
              />
              {hasAnthropicApiKey && (
                <p className="text-xs text-muted-foreground">
                  Saved key on file ({anthropicKeyHint || "configured"}). Leave blank to keep current key.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Uses Claude Sonnet 4.5 for resume parsing and analysis
              </p>
            </div>
          )}

          {provider === "openai" && (
            <div className="space-y-2">
              <Label htmlFor="openai-key">OpenAI API Key</Label>
              <Input
                id="openai-key"
                type="password"
                placeholder="sk-..."
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
              />
              {hasOpenaiApiKey && (
                <p className="text-xs text-muted-foreground">
                  Saved key on file ({openaiKeyHint || "configured"}). Leave blank to keep current key.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Uses o3 (highest reasoning model) for resume parsing and analysis
              </p>
            </div>
          )}

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
