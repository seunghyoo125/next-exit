export interface JDInterpretation {
  roleSummary: string[];
  coreResponsibilities: string[];
  realSkills: string[];
  seniorityLevel: string;
  misleadingSignals: { signal: string; reality: string }[];
  matchGuidance: string[];
}

export type BulletCategory = "experience" | "education" | "additional";

export type RoleLevel = "manager" | "sa" | "partnership";

export interface ParsedBullet {
  content: string;
  section: string;
  company: string;
  roleTitle: string;
  category: BulletCategory;
  roleLevel: RoleLevel | "";
  theme: string;
}

export interface ParsedResume {
  bullets: ParsedBullet[];
}

export interface SectionConfig {
  roleTitle: string;
  company: string;
  bulletCount: number;
}

export interface RecommendedBullet {
  bulletId: string;
  content: string;
  score: number;
  reason: string;
}

export interface SectionRecommendation {
  roleTitle: string;
  company: string;
  recommendations: RecommendedBullet[];
  formatSuggestion?: string;
}

export interface RoleInput {
  label: string;
  jobDescription: string;
}

export interface RoleFitAssessment {
  label: string;
  fitScore: number;           // 0-100, secondary to fitLevel
  fitLevel: "strong" | "moderate" | "stretch";
  matchedSkills: string[];
  gapAreas: string[];
  strengthHighlights: string[];
  reframingAdvice: string[];
  topFivePercentPath: string;
}

export interface RoleComparisonSummary {
  rankings: RoleFitAssessment[];    // ordered best-fit first
  overallRecommendation: string;    // strategic advice
  commonStrengths: string[];
  universalGaps: string[];
  executionPlan: string;            // concrete steps for the recommended role
}

export interface RoleComparisonResult {
  roleResults: Record<string, SectionRecommendation[]>;
  interpretations: Record<string, JDInterpretation>;
  summary: RoleComparisonSummary;
}

export interface StrategyAssessment {
  coreWorkAlignment: string[];
  topFivePercentViability: string[];
  strengthsToLeverage: string[];          // ranked: most differentiating first
  criticalGaps: string[];
  executionPlan: string[];
  overallReadiness: "strong" | "moderate" | "stretch";
  leadWithThemes: string[];               // top 3 themes to lead with
  deEmphasizeThemes: string[];            // top 2 themes to de-emphasize
  fluffAndJargon: string[];               // JD phrases disregarded as fluff
}

export interface BulletReview {
  bulletId: string;
  originalText: string;
  verdict: "good" | "tone" | "enhance";
  feedback: string;
  suggestedText?: string;
}

export interface SanityCheckResult {
  overallCoherence: string;
  narrativeGaps: string[];
  redundancies: string[];
  toneConsistency: string;
  finalVerdict: "ready" | "needs_changes";
  suggestions: string[];
}

export interface EvidenceConstraint {
  bulletId: string;
  allowedClaims: string[];      // 2-4 phrases the rewrite may assert
  disallowedClaims: string[];   // 1-3 phrases it must NOT add
  missingInfoPrompt?: string;   // 1 question if rewrite would need new facts
}

export interface CandidateProfile {
  background: string;
  proofPoints: string[];
  topStrengths: string[];
  constraints: string[];
  preferredTone: string;
}

export interface ClarificationQuestion {
  id: string;        // "q1", "q2", ... — stable key for answer mapping
  question: string;
  context: string;   // 1 sentence: why this is ambiguous
}

export interface GroundTruthProfile {
  groundTruthSummary: string;        // 6-10 lines, internal voice
  currentScope: string;
  pastFoundation: string;
  systemsBuilt: string[];
  operatingModel: string[];          // e.g. "startup within enterprise"
  inProgressWork: string[];
  nextPlannedSteps: string[];
  proofPoints: string[];             // ONLY explicit user-provided facts
  openQuestionsOptional: { question: string; whyItMatters: string }[];
}

export interface ProfileRefinementResult {
  groundTruth: GroundTruthProfile;
  clarificationQuestions: ClarificationQuestion[];  // only populated in enrichment mode
  phase: 1 | 2;
}

export interface ProfileRefineRequest {
  profile: CandidateProfile;
  clarificationAnswers?: Record<string, string>;
  mode?: "default" | "enrichment";
  phase?: 1 | 2;
  confirmedSummary?: string;
}

export type BuilderStep = 1 | 2 | 3 | 4 | 5;
