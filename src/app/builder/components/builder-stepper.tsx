"use client";

import { BuilderStep } from "@/types";

const STEPS: { label: string; number: BuilderStep }[] = [
  { label: "JD Analysis", number: 1 },
  { label: "Strategy", number: 2 },
  { label: "Format", number: 3 },
  { label: "Bullets", number: 4 },
  { label: "Review", number: 5 },
];

interface BuilderStepperProps {
  currentStep: BuilderStep;
  completedSteps: Set<number>;
  onStepClick: (step: BuilderStep) => void;
}

export default function BuilderStepper({
  currentStep,
  completedSteps,
  onStepClick,
}: BuilderStepperProps) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, idx) => {
        const isActive = step.number === currentStep;
        const isCompleted = completedSteps.has(step.number);
        const isClickable = isCompleted || step.number === currentStep;

        return (
          <div key={step.number} className="flex items-center">
            {idx > 0 && (
              <div
                className={`w-8 h-0.5 ${
                  completedSteps.has(STEPS[idx - 1].number)
                    ? "bg-primary"
                    : "bg-muted-foreground/20"
                }`}
              />
            )}
            <button
              onClick={() => isClickable && onStepClick(step.number)}
              disabled={!isClickable}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isCompleted
                  ? "bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              <span
                className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                  isActive
                    ? "bg-primary-foreground text-primary"
                    : isCompleted
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted-foreground/20 text-muted-foreground"
                }`}
              >
                {isCompleted && !isActive ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  step.number
                )}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
