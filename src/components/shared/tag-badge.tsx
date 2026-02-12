import { Badge } from "@/components/ui/badge";

interface TagBadgeProps {
  label: string;
  variant?: "default" | "secondary" | "outline";
  onRemove?: () => void;
}

export function TagBadge({ label, variant = "secondary", onRemove }: TagBadgeProps) {
  return (
    <Badge variant={variant} className="gap-1 text-xs">
      {label}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:text-destructive"
        >
          x
        </button>
      )}
    </Badge>
  );
}
