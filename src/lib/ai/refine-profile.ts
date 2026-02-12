import { callAI, parseAIJSON } from "./client";
import { CandidateProfile, GroundTruthProfile, ProfileRefinementResult } from "@/types";

const SCHEMA_HINT = `{
  groundTruth: {
    groundTruthSummary: string,
    currentScope: string,
    pastFoundation: string,
    systemsBuilt: string[],
    operatingModel: string[],
    inProgressWork: string[],
    nextPlannedSteps: string[],
    proofPoints: string[],
    openQuestionsOptional: [{ question: string, whyItMatters: string }]
  },
  clarificationQuestions: [{ id: string, question: string, context: string }]
}`;

const phase1SystemPrompt = `You are an internal ground-truth synthesis layer for a resume-building pipeline. Your output is consumed by downstream AI agents — not shown directly to end users. Write in neutral internal-reference voice: short labeled paragraphs or bullet blocks. Not resume prose, not case study, not narrative.

## Core Rules

1. **Factual synthesis only.** Record what the candidate actually stated — role scope, team shape, concrete outcomes. Do not evaluate, score, assess fit, suggest positioning, or reframe experience. That happens in later pipeline steps.

2. **Uncertainty preservation.** Do NOT convert hypotheses into completed outcomes.
   - If user says "researching how to X" → output "Currently exploring X" — NOT "designed a method for X."
   - Required patterns for in-progress work: "Currently exploring…", "Early approach…", "In calibration phase…", "Next planned step: …"
   - If something is ambiguous, mark it as such rather than guessing.

3. **proofPoints rule.** Only populate proofPoints from explicit user-provided facts (metrics, outcomes, named deliverables). Never infer or fabricate proof points.

4. **No role inference.** Do NOT infer seniority level, leadership type, management style, or role classification from context clues. If the user says "I work with a team of 8 engineers" — record that verbatim. Do NOT output "manages a team" or "senior engineering leader" unless the user explicitly used those words. Titles and levels must come from the user's own language.

5. **Preserve emphasis and sequencing.** The groundTruthSummary paragraphs should follow the order and relative emphasis the user provided in their background input. If the user led with their current project, lead with that. If they spent three sentences on cross-functional work and one on technical skills, reflect that proportion. Do not reorganize or reweight. Only deviate from the user's ordering when a later reference is unintelligible without an earlier one — and even then, prefer adding a brief inline note over moving paragraphs.

6. **Ground Truth Reflection output.** This is Phase 1: faithfully reflect what the user shared. The goal is fidelity and cohesion, not normalization.

7. **No adjectival characterizations.** Do not reduce behaviors to adjective labels like "quality-first", "data-driven", or "detail-oriented." Instead describe the concrete behavior: what the person actually does. "Reviews every PR before merge" is a behavior; "quality-first" is an interpretation.

## Output Fields

- **groundTruthSummary**: This is the **primary output**. Write 8-15 labeled paragraphs, each covering a coherent theme from the candidate's background. Use paragraph form where information spans multiple concepts. Do NOT reduce to one-line telegraphic items. Each paragraph should have a short bold label (e.g. "**Current Role:**", "**Team & Scope:**") followed by a cohesive paragraph synthesizing related information.
- **currentScope**: What the candidate currently does — role, team, domain. Write as a short paragraph.
- **pastFoundation**: Prior experience that shapes current capability. Write as a short paragraph.
- **systemsBuilt**: Populate as **provisional**. Prefer empty arrays over forced extraction. If an item doesn't clearly stand alone as a distinct entry, leave it in groundTruthSummary instead. An empty array is a valid and preferred output when the information is better preserved in narrative form. Ambiguous or composite items — ones that span multiple concepts or require interpretation to classify — must stay in groundTruthSummary.
- **operatingModel**: Populate as **provisional** — same guidance as systemsBuilt. Prefer empty arrays over forced extraction. If an item doesn't clearly stand alone as a distinct entry, leave it in groundTruthSummary instead. An empty array is a valid and preferred output when the information is better preserved in narrative form. Ambiguous or composite items — ones that span multiple concepts or require interpretation to classify — must stay in groundTruthSummary.
- **inProgressWork**: Populate as **provisional** — same guidance. Prefer empty arrays over forced extraction. Preserve WIP status language.
- **nextPlannedSteps**: Populate as **provisional** — only include explicitly stated future plans. Prefer empty arrays over forced extraction. An empty array is a valid and preferred output when the information is better preserved in narrative form.
- **proofPoints**: ONLY explicit user-provided metrics, outcomes, or named deliverables. Never infer. Populate regardless of phase — this is important.
- **openQuestionsOptional**: Ambiguities that exist but don't block synthesis. Each has "question" and "whyItMatters".

## Clarification Question Rules (mode-dependent)
- In "default" mode: clarificationQuestions MUST be an empty array. Use openQuestionsOptional for noting ambiguity instead. Only ask a clarification question if two materially different interpretations would change downstream reasoning — and even then, put it in openQuestionsOptional, not clarificationQuestions.
- In "enrichment" mode: produce 3-5 interactive clarificationQuestions framed as optional precision improvements. These should seek ground-truth facts, not self-assessments.
  - Good: "Were these direct reports or a cross-functional group you coordinated?"
  - Good: "Was the 30% reduction measured quarter-over-quarter or year-over-year?"
  - Bad: "How would you describe the impact of your leadership?"
  - Each must include "id" (e.g. "q1"), "question", and "context" (1 sentence explaining what is ambiguous).

## When Clarification Answers Are Provided
- Incorporate the answers into the structured output.
- Only ask NEW questions — do not re-ask questions that have been answered.
- If no ambiguity remains, return empty arrays for both clarification fields.`;

const phase2SystemPrompt = `You are normalizing a confirmed ground-truth reflection into structured fields for downstream pipeline consumption. The user has already reviewed and confirmed the ground-truth summary from Phase 1. Your job is to properly extract and normalize the confirmed information into all structured fields.

## Core Rules

1. **Factual synthesis only.** Record what the candidate actually stated — role scope, team shape, concrete outcomes. Do not evaluate, score, assess fit, suggest positioning, or reframe experience. That happens in later pipeline steps.

2. **Uncertainty preservation.** Do NOT convert hypotheses into completed outcomes.
   - If the reflection says "Currently exploring X" → keep it as "Currently exploring X" — NOT "designed a method for X."
   - Required patterns for in-progress work: "Currently exploring…", "Early approach…", "In calibration phase…", "Next planned step: …"
   - If something is ambiguous, mark it as such rather than guessing.

3. **proofPoints rule.** Only populate proofPoints from explicit user-provided facts (metrics, outcomes, named deliverables). Never infer or fabricate proof points.

4. **No role inference.** Do NOT infer seniority level, leadership type, management style, or role classification from context clues. If the confirmed reflection says "works with a team of 8 engineers" — extract that verbatim. Do NOT output "manages a team" or "senior engineering leader" unless those exact words appear in the confirmed reflection. Titles and levels must come from the user's own language.

5. **Normalization output.** This is Phase 2: take the confirmed reflection and properly normalize into structured fields. Be thorough in extraction — every distinct item should be captured in the appropriate field.

6. **No adjectival characterizations.** Do not reduce behaviors to adjective labels like "quality-first", "data-driven", or "detail-oriented." Describe the concrete behavior instead.

## Output Fields

- **groundTruthSummary**: Pass through the confirmed summary unchanged, or apply only minor tightening if the user edited it (fix grammar, remove redundancy). Do NOT substantially rewrite.
- **currentScope**: What the candidate currently does — role, team, domain.
- **pastFoundation**: Prior experience that shapes current capability.
- **systemsBuilt**: Concrete systems, processes, or artifacts the candidate built or owns. Only extract items that are explicitly stated. If an item requires interpretation to classify (e.g., inferring "people manager" from "works with a team"), leave it out. Sparse arrays are acceptable when the confirmed reflection doesn't contain clearly extractable items for a field. Ambiguous or composite items that span multiple concepts must not be forced into a single array entry — leave them in the narrative summary.
- **operatingModel**: How the candidate operates (e.g. "startup within enterprise", "cross-functional coordinator", "IC with broad influence"). Only extract items that are explicitly stated. If an item requires interpretation to classify, leave it out. Sparse arrays are acceptable when the confirmed reflection doesn't contain clearly extractable items for a field. Ambiguous or composite items that span multiple concepts must not be forced into a single array entry — leave them in the narrative summary.
- **inProgressWork**: Things actively being worked on, experimented with, or explored. Preserve WIP status. Only extract items that are explicitly stated. Sparse arrays are acceptable.
- **nextPlannedSteps**: Stated future plans or intentions. Only extract items that are explicitly stated. Sparse arrays are acceptable.
- **proofPoints**: ONLY explicit user-provided metrics, outcomes, or named deliverables. Never infer.
- **openQuestionsOptional**: Ambiguities that exist but don't block synthesis. Each has "question" and "whyItMatters".

## Clarification Questions
- clarificationQuestions MUST always be an empty array in Phase 2. This phase is extraction, not inquiry.`;

const EMPTY_GROUND_TRUTH: GroundTruthProfile = {
  groundTruthSummary: "",
  currentScope: "",
  pastFoundation: "",
  systemsBuilt: [],
  operatingModel: [],
  inProgressWork: [],
  nextPlannedSteps: [],
  proofPoints: [],
  openQuestionsOptional: [],
};

export async function refineProfile(
  profile: CandidateProfile,
  clarificationAnswers?: Record<string, string>,
  mode: "default" | "enrichment" = "default",
  phase: 1 | 2 = 1,
  confirmedSummary?: string
): Promise<ProfileRefinementResult> {
  const profileFields = [
    `Background: ${profile.background}`,
    profile.proofPoints.length > 0
      ? `Proof Points:\n${profile.proofPoints.map((p) => `- ${p}`).join("\n")}`
      : "",
    profile.topStrengths.length > 0
      ? `Top Strengths:\n${profile.topStrengths.map((s) => `- ${s}`).join("\n")}`
      : "",
    profile.constraints.length > 0
      ? `Constraints:\n${profile.constraints.map((c) => `- ${c}`).join("\n")}`
      : "",
    profile.preferredTone ? `Preferred Tone: ${profile.preferredTone}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  let systemPrompt: string;
  let prompt: string;
  let label: string;

  if (phase === 2) {
    systemPrompt = phase2SystemPrompt;
    label = "normalize-profile";

    prompt = `## Confirmed Ground Truth Reflection
${confirmedSummary || ""}

## Original Candidate Profile Fields
${profileFields}

Normalize the confirmed reflection into the full structured output.

## Output Format
Return a JSON object with:
- "groundTruth": object with fields: groundTruthSummary (string), currentScope (string), pastFoundation (string), systemsBuilt (string[]), operatingModel (string[]), inProgressWork (string[]), nextPlannedSteps (string[]), proofPoints (string[]), openQuestionsOptional (array of {question, whyItMatters})
- "clarificationQuestions": empty array []

Return ONLY valid JSON, no markdown code blocks or other text.`;
  } else {
    systemPrompt = phase1SystemPrompt;
    label = "refine-profile";

    const answersBlock =
      clarificationAnswers && Object.keys(clarificationAnswers).length > 0
        ? `\n\n## Clarification Answers from Candidate\n${Object.entries(clarificationAnswers)
            .map(([id, answer]) => `- ${id}: ${answer}`)
            .join("\n")}\n\nIncorporate these answers into the structured output. Do NOT re-ask these questions.`
        : "";

    const modeInstruction = mode === "enrichment"
      ? `\n\nMode: ENRICHMENT — produce full structured groundTruth AND 3-5 interactive clarificationQuestions as optional precision improvements.`
      : `\n\nMode: DEFAULT — produce full structured groundTruth. clarificationQuestions MUST be an empty array. Note any ambiguity in openQuestionsOptional instead.`;

    prompt = `## Candidate Profile Fields
${profileFields}${answersBlock}${modeInstruction}

## Output Format
Return a JSON object with:
- "groundTruth": object with fields: groundTruthSummary (string), currentScope (string), pastFoundation (string), systemsBuilt (string[]), operatingModel (string[]), inProgressWork (string[]), nextPlannedSteps (string[]), proofPoints (string[]), openQuestionsOptional (array of {question, whyItMatters})
- "clarificationQuestions": array of objects with "id", "question", "context" (empty array in default mode, 3-5 items in enrichment mode)

Return ONLY valid JSON, no markdown code blocks or other text.`;
  }

  const text = await callAI(prompt, 4096, { system: systemPrompt, label });

  try {
    const parsed = (await parseAIJSON(text, SCHEMA_HINT, label)) as Record<string, unknown>;

    const rawGT = (parsed.groundTruth || {}) as Record<string, unknown>;

    const groundTruth: GroundTruthProfile = {
      groundTruthSummary: typeof rawGT.groundTruthSummary === "string" ? rawGT.groundTruthSummary : "",
      currentScope: typeof rawGT.currentScope === "string" ? rawGT.currentScope : "",
      pastFoundation: typeof rawGT.pastFoundation === "string" ? rawGT.pastFoundation : "",
      systemsBuilt: Array.isArray(rawGT.systemsBuilt)
        ? rawGT.systemsBuilt.filter((s: unknown) => typeof s === "string") as string[]
        : [],
      operatingModel: Array.isArray(rawGT.operatingModel)
        ? rawGT.operatingModel.filter((s: unknown) => typeof s === "string") as string[]
        : [],
      inProgressWork: Array.isArray(rawGT.inProgressWork)
        ? rawGT.inProgressWork.filter((s: unknown) => typeof s === "string") as string[]
        : [],
      nextPlannedSteps: Array.isArray(rawGT.nextPlannedSteps)
        ? rawGT.nextPlannedSteps.filter((s: unknown) => typeof s === "string") as string[]
        : [],
      proofPoints: Array.isArray(rawGT.proofPoints)
        ? rawGT.proofPoints.filter((s: unknown) => typeof s === "string") as string[]
        : [],
      openQuestionsOptional: Array.isArray(rawGT.openQuestionsOptional)
        ? rawGT.openQuestionsOptional
            .filter(
              (q: unknown) => {
                const obj = q as Record<string, unknown>;
                return typeof obj.question === "string" && typeof obj.whyItMatters === "string";
              }
            )
            .map((q: unknown) => {
              const obj = q as Record<string, unknown>;
              return { question: obj.question as string, whyItMatters: obj.whyItMatters as string };
            })
        : [],
    };

    const clarificationQuestions = Array.isArray(parsed.clarificationQuestions)
      ? parsed.clarificationQuestions
          .filter(
            (q: Record<string, unknown>) =>
              typeof q.id === "string" &&
              typeof q.question === "string" &&
              typeof q.context === "string"
          )
          .map((q: Record<string, unknown>) => ({
            id: q.id as string,
            question: q.question as string,
            context: q.context as string,
          }))
      : [];

    return { groundTruth, clarificationQuestions, phase };
  } catch {
    return { groundTruth: { ...EMPTY_GROUND_TRUTH }, clarificationQuestions: [], phase };
  }
}
