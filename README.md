# Next Exit  
**A Structured Career Transition System**

Next Exit is a decision framework for career transitions. It converts a job description and a candidate’s real experience into an evidence-bounded positioning strategy.

This is not a resume generator. It is a structured interpretation and evaluation system designed to help professionals reframe existing experience honestly and strategically for new roles.

The core principle is functional relevance over literal matching. Building healthcare dashboards can be relevant to fintech dashboards because the transferable capability is dashboard design, not the industry label. The system is built to detect that distinction.

It emphasizes three things:

- Interpret what a role actually requires  
- Map real experience to those requirements without distortion  
- Enforce guardrails so nothing unsupported is claimed  

---

## Core Philosophy

Most tools optimize for keyword density.  
Next Exit optimizes for defensible positioning.

Every module operates within strict constraints:

- No invented metrics  
- No fabricated responsibilities  
- No unsupported claims  
- No auto-generated resume without explicit selection  

The output is not just a document. The output is a positioning decision backed by evidence.

---

## System Architecture

### 1. JD Interpretation

The system analyzes the job description structurally, not superficially.

It identifies:

- True capability requirements versus wishlist noise  
- Title inflation or misleading seniority signals  
- Functional responsibilities hidden behind vague language  
- Core evaluation themes for the role  

The result is a capability map rather than a keyword list.

---

### 2. Strategy Assessment

Your entire bullet bank is evaluated against the extracted capability map.

The system:

- Ranks strengths by differentiation  
- Proposes gaps, then re-validates them to eliminate false negatives  
- Assigns a readiness classification: strong, moderate, or stretch  
- Recommends which themes to emphasize and which to de-emphasize  

This is an honest fit assessment, not a confidence boost engine.

---

### 3. Format Structuring

Based on your bullet distribution and role targeting strategy, the system recommends structural emphasis.

Examples:

- Manager-heavy configuration  
- Senior individual contributor emphasis  
- Custom section weighting  

Structure reflects actual positioning strategy rather than arbitrary formatting.

---

### 4. Evidence-Bounded Bullet Review

Every bullet passes through an evidence gate.

The system determines:

- What each bullet demonstrably proves  
- Allowed claims versus disallowed claims  
- Relevance score per section  

Rewrite suggestions remain strictly within supported scope.  
No metric invention. No inflated scope.

---

### 5. Sanity Check

A holistic review of the final document for:

- Narrative coherence  
- Theme consistency  
- Redundancy  
- Section balance  
- Tone alignment  

Verdict: ready or requires revision.

---

## Additional Capabilities

### Bullet Bank  
Central repository of accomplishments with metadata and role-level tagging.

### Resume Parsing  
Upload PDF or DOCX files. Bullets are extracted and structured with company, role, and theme classification.

### Candidate Profile  
Persistent ground truth context about background, constraints, proof points, and preferred positioning.

### Projects Library  
Detailed project descriptions to anchor bullets in real work.

### Role Comparison  
Side-by-side evaluation of multiple job descriptions with ranking and strategic recommendation.

### Prompt Transparency  
Full visibility into system prompts and model responses at every step.

---

## Tech Stack

- Next.js 16 with React 19  
- TypeScript  
- SQLite via Prisma ORM  
- Anthropic Claude Sonnet 4.5 or OpenAI o3  
- Radix UI and shadcn/ui with Tailwind CSS  
- pdf-parse and mammoth for file ingestion  

---

## Why “Next Exit”

Career transitions rarely follow a straight path. Some are linear. Others involve lane changes, recalibration, and traffic. The exit still exists, but reaching it requires intentional navigation.

Next Exit is built around that belief. It does not promise shortcuts. It provides structure.

---

## Positioning Note

This repository exists as an applied example of structured decision orchestration using LLMs with evaluation gates and behavioral constraints. The domain is career transition, but the architectural patterns reflect broader interests in capability mapping, evidence validation, and AI-assisted reasoning systems.
