"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface BulletFiltersProps {
  themes: string[];
  companies: string[];
  selectedRoleLevel: string;
  selectedTheme: string;
  selectedCompany: string;
  selectedCategory: string;
  searchQuery: string;
  onRoleLevelChange: (value: string) => void;
  onThemeChange: (value: string) => void;
  onCompanyChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onClear: () => void;
}

export function BulletFilters({
  themes,
  companies,
  selectedRoleLevel,
  selectedTheme,
  selectedCompany,
  selectedCategory,
  searchQuery,
  onRoleLevelChange,
  onThemeChange,
  onCompanyChange,
  onCategoryChange,
  onSearchChange,
  onClear,
}: BulletFiltersProps) {
  const hasFilters = selectedRoleLevel || selectedTheme || selectedCompany || searchQuery || selectedCategory !== "experience";

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="Search bullets..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9"
        />
      </div>

      <Select value={selectedCategory} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="experience">Experience</SelectItem>
          <SelectItem value="education">Education</SelectItem>
          <SelectItem value="additional">Additional</SelectItem>
          <SelectItem value="all">All Categories</SelectItem>
        </SelectContent>
      </Select>

      <Select value={selectedRoleLevel || "all"} onValueChange={(v) => onRoleLevelChange(v === "all" ? "" : v)}>
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="Role Level" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Levels</SelectItem>
          <SelectItem value="manager">Manager</SelectItem>
          <SelectItem value="sa">SA</SelectItem>
          <SelectItem value="partnership">Partnership</SelectItem>
        </SelectContent>
      </Select>

      <Select value={selectedTheme || "all"} onValueChange={(v) => onThemeChange(v === "all" ? "" : v)}>
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="Theme" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Themes</SelectItem>
          {themes.filter(Boolean).map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedCompany || "all"} onValueChange={(v) => onCompanyChange(v === "all" ? "" : v)}>
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="Target Company" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Target Companies</SelectItem>
          {companies.filter(Boolean).map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-9">
          Clear
        </Button>
      )}
    </div>
  );
}
