"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BulletReview } from "@/types";

interface BulletReviewCardProps {
  review: BulletReview;
  finalText: string;
  userDecision: string;
  onAcceptSuggestion: () => void;
  onEditManually: (text: string) => void;
  onKeepOriginal: () => void;
}

export default function BulletReviewCard({
  review,
  finalText,
  userDecision,
  onAcceptSuggestion,
  onEditManually,
  onKeepOriginal,
}: BulletReviewCardProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(finalText || review.suggestedText || review.originalText);

  const verdictStyles = {
    good: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-700",
    tone: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700",
    enhance: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700",
  };

  const verdictLabels = {
    good: "Good",
    tone: "Tone",
    enhance: "Enhance",
  };

  const handleSaveEdit = () => {
    onEditManually(editText);
    setEditing(false);
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Original text + verdict */}
      <div className="flex items-start gap-3">
        <Badge className={`text-xs shrink-0 ${verdictStyles[review.verdict]}`} variant="outline">
          {verdictLabels[review.verdict]}
        </Badge>
        <p className="text-sm flex-1">{review.originalText}</p>
      </div>

      {/* Feedback */}
      <div className="ml-0 p-2.5 bg-muted/50 rounded-md">
        <p className="text-xs text-muted-foreground">{review.feedback}</p>
      </div>

      {/* Suggested rewrite */}
      {review.suggestedText && review.verdict !== "good" && (
        <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
          <p className="text-xs text-muted-foreground mb-1">Suggested rewrite:</p>
          <p className="text-sm text-blue-800 dark:text-blue-200">{review.suggestedText}</p>
        </div>
      )}

      {/* Edit mode */}
      {editing && (
        <div className="space-y-2">
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="min-h-[60px] text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveEdit}>Save Edit</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!editing && (
        <div className="flex items-center gap-2">
          {review.suggestedText && review.verdict !== "good" && (
            <Button
              size="sm"
              variant={userDecision === "accept" ? "default" : "outline"}
              onClick={onAcceptSuggestion}
            >
              {userDecision === "accept" ? "Accepted" : "Accept Suggestion"}
            </Button>
          )}
          <Button
            size="sm"
            variant={userDecision === "edit" ? "default" : "outline"}
            onClick={() => setEditing(true)}
          >
            {userDecision === "edit" ? "Edited" : "Edit Manually"}
          </Button>
          <Button
            size="sm"
            variant={userDecision === "keep" ? "default" : "outline"}
            onClick={onKeepOriginal}
          >
            {userDecision === "keep" ? "Keeping Original" : "Keep Original"}
          </Button>

          {/* Show current final text if decided */}
          {userDecision && finalText && (
            <span className="text-xs text-muted-foreground ml-2 truncate max-w-[200px]">
              Final: &quot;{finalText.slice(0, 50)}...&quot;
            </span>
          )}
        </div>
      )}
    </div>
  );
}
