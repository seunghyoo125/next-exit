"use client";

import { useState, useEffect, useCallback } from "react";
import { BulletCard } from "@/components/bullets/bullet-card";
import { BulletFilters } from "@/components/bullets/bullet-filters";
import { Button } from "@/components/ui/button";
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

interface TagData {
  roleLevels: string[];
  themes: string[];
  companies: string[];
}

const roleLevelLabels: Record<string, string> = {
  manager: "Manager-level",
  sa: "SA-level",
  partnership: "Partnership / Additional",
  "": "Uncategorized",
};

export default function BulletsPage() {
  const [bullets, setBullets] = useState<BulletData[]>([]);
  const [tags, setTags] = useState<TagData>({ roleLevels: [], themes: [], companies: [] });
  const [loading, setLoading] = useState(true);
  const [selectedRoleLevel, setSelectedRoleLevel] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("experience");
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [analyses, setAnalyses] = useState<Record<string, string>>({});
  const [analyzing, setAnalyzing] = useState(false);

  const fetchBullets = useCallback(async () => {
    const params = new URLSearchParams();
    if (selectedRoleLevel) params.set("roleLevel", selectedRoleLevel);
    if (selectedTheme) params.set("theme", selectedTheme);
    if (selectedCompany) params.set("company", selectedCompany);
    if (selectedCategory && selectedCategory !== "experience") params.set("category", selectedCategory);
    if (searchQuery) params.set("q", searchQuery);

    const res = await fetch(`/api/bullets?${params}`);
    const data = await res.json();
    setBullets(data.bullets);
    if (data.themeAnalyses && Object.keys(data.themeAnalyses).length > 0) {
      setAnalyses(data.themeAnalyses);
    }
    setLoading(false);
  }, [selectedRoleLevel, selectedTheme, selectedCompany, selectedCategory, searchQuery]);

  const fetchTags = useCallback(async () => {
    const res = await fetch("/api/tags");
    const data = await res.json();
    setTags(data);
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    const timer = setTimeout(fetchBullets, 300);
    return () => clearTimeout(timer);
  }, [fetchBullets]);

  const handleUpdate = (updated: BulletData) => {
    setBullets((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  const handleDelete = (id: string) => {
    setBullets((prev) => prev.filter((b) => b.id !== id));
  };

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/bullets/analyze", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setAnalyses(data.analyses);
      toast.success("Analysis complete");
    } catch {
      toast.error("Failed to analyze variants");
    } finally {
      setAnalyzing(false);
    }
  };

  // Group bullets by roleLevel, then by theme
  const groupedBullets = (() => {
    const levelOrder = ["manager", "sa", "partnership", ""];
    const byLevel: Record<string, Record<string, BulletData[]>> = {};

    for (const bullet of bullets) {
      const level = bullet.roleLevel || "";
      const theme = bullet.theme || "Uncategorized";
      if (!byLevel[level]) byLevel[level] = {};
      if (!byLevel[level][theme]) byLevel[level][theme] = [];
      byLevel[level][theme].push(bullet);
    }

    return levelOrder
      .filter((level) => byLevel[level])
      .map((level) => ({
        level,
        label: roleLevelLabels[level] || level,
        themes: Object.entries(byLevel[level]).map(([theme, items]) => ({
          theme,
          bullets: items,
        })),
        totalBullets: Object.values(byLevel[level]).reduce((sum, items) => sum + items.length, 0),
      }));
  })();

  const hasFilters = selectedRoleLevel || selectedTheme || selectedCompany || searchQuery || selectedCategory !== "experience";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bullet Bank</h1>
          <p className="text-muted-foreground mt-1">
            {bullets.length} bullets{" "}
            {hasFilters && "(filtered)"}
          </p>
        </div>
        {!loading && bullets.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={runAnalysis}
            disabled={analyzing}
          >
            {analyzing ? "Analyzing..." : "Re-analyze"}
          </Button>
        )}
      </div>

      <BulletFilters
        themes={tags.themes}
        companies={tags.companies}
        selectedRoleLevel={selectedRoleLevel}
        selectedTheme={selectedTheme}
        selectedCompany={selectedCompany}
        selectedCategory={selectedCategory}
        searchQuery={searchQuery}
        onRoleLevelChange={setSelectedRoleLevel}
        onThemeChange={setSelectedTheme}
        onCompanyChange={setSelectedCompany}
        onCategoryChange={setSelectedCategory}
        onSearchChange={setSearchQuery}
        onClear={() => {
          setSelectedRoleLevel("");
          setSelectedTheme("");
          setSelectedCompany("");
          setSelectedCategory("experience");
          setSearchQuery("");
        }}
      />

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading bullets...</div>
      ) : bullets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No bullets found.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a resume to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedBullets.map((levelGroup) => {
            const levelKey = `level-${levelGroup.level}`;
            const levelCollapsed = collapsedSections.has(levelKey);

            return (
              <div key={levelGroup.level} className="space-y-3">
                <button
                  onClick={() => toggleSection(levelKey)}
                  className="flex items-center gap-2 text-lg font-semibold hover:text-primary transition-colors w-full text-left"
                >
                  <span className="text-muted-foreground text-sm">
                    {levelCollapsed ? "\u25b8" : "\u25be"}
                  </span>
                  {levelGroup.label}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({levelGroup.totalBullets} bullets)
                  </span>
                </button>

                {!levelCollapsed && (
                  <div className="ml-4 space-y-4">
                    {levelGroup.themes.map((themeGroup) => {
                      const themeKey = `${levelGroup.level}-${themeGroup.theme}`;
                      const themeCollapsed = collapsedSections.has(themeKey);

                      return (
                        <div key={themeGroup.theme} className="space-y-2">
                          <button
                            onClick={() => toggleSection(themeKey)}
                            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                          >
                            <span className="text-xs">
                              {themeCollapsed ? "\u25b8" : "\u25be"}
                            </span>
                            {themeGroup.theme}
                            <span className="text-xs font-normal">
                              ({themeGroup.bullets.length} {themeGroup.bullets.length === 1 ? "variant" : "variants"})
                            </span>
                          </button>

                          {!themeCollapsed && analyses[themeGroup.theme] && (
                            <p className="ml-6 text-xs text-muted-foreground italic">
                              {analyses[themeGroup.theme]}
                            </p>
                          )}

                          {!themeCollapsed && (
                            <div className="ml-4 space-y-2">
                              {themeGroup.bullets.map((bullet) => (
                                <BulletCard
                                  key={bullet.id}
                                  bullet={bullet}
                                  themeSuggestions={tags.themes}
                                  onUpdate={handleUpdate}
                                  onDelete={handleDelete}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
