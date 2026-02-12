# Resume Builder

An AI-powered resume tailoring system that helps candidates build targeted, top-5% resumes. Instead of keyword-stuffing, it understands what roles *actually* require and maps your real experience to those needs.

## What It Does

Most resume tools match keywords. This one doesn't.

The core idea: "building healthcare dashboards" is relevant to a fintech dashboard role — because the skill is dashboarding, not the industry. Every AI module in the system is built around this principle of **functional relevance over literal text matching**.

The app maintains a **bullet bank** — a centralized repository of resume accomplishments extracted from your past resumes. When you target a new role, a 5-step guided builder interprets the job description, honestly assesses your fit, recommends which bullets to use, reviews and rewrites them for the target role, and runs a final sanity check on the complete resume.

## How the Builder Works

### Step 1: JD Interpretation
Paste a job description. The AI reads between the lines — "Lead" in a title doesn't always mean people management, "Senior" doesn't always mean truly senior (title inflation), and the requirements section is a wishlist, not hard requirements. It extracts what the role *actually* needs and flags misleading signals.

### Step 2: Strategy Assessment
A brutally honest fit assessment against your entire bullet bank. Strengths ranked by differentiation, gaps verified with a two-pass validation (the AI proposes gaps, then checks each one against your bullets to eliminate false negatives from keyword mismatches). You get a readiness level: strong, moderate, or stretch — plus which themes to lead with and which to de-emphasize.

### Step 3: Format Selection
AI recommends a resume format preset based on your bullet distribution (e.g., 7 manager bullets / 4 senior associate / 1 partnership), or you define custom sections.

### Step 4: Bullet Selection & Review
The AI ranks every bullet in your bank by relevance (0-100) for each section. After you select bullets, an **evidence check** pre-pass determines what each bullet actually demonstrates — allowed claims vs. disallowed claims. Then the review phase suggests rewrites that stay strictly within what your experience supports. No metric invention, no fabricated claims.

### Step 5: Sanity Check
A holistic review of the complete resume: coherence, narrative gaps, redundancies, tone consistency, and section balance. Verdict: ready or needs changes.

## Other Features

- **Resume Upload & Parsing** — Upload PDF or DOCX resumes. AI extracts every bullet with section/company/role metadata and classifies them by role level and theme.
- **Bullet Bank** — Browse, filter, and edit all your bullets. Theme-based variant analysis shows how you've framed the same accomplishment differently across target roles.
- **Role Comparison** — Enter 2-3 job descriptions to compare fit side-by-side. Get rankings, common strengths, universal gaps, and a recommendation for which role has the clearest advantage.
- **Candidate Profile** — Persistent context (background, proof points, strengths, constraints, preferred tone) that all AI modules reference. Two-phase AI refinement synthesizes your input into structured ground truth.
- **Projects Library** — Store detailed project descriptions so the AI understands what you actually built, not just what your bullets say.
- **Draft Auto-Save** — The builder saves progress automatically. Resume any build from where you left off.
- **Prompt Transparency** — View the exact prompts and responses sent to the AI at each step.

## Tech Stack

- **Framework**: Next.js 16 (App Router) with React 19
- **Language**: TypeScript
- **Database**: SQLite via Prisma ORM
- **AI**: Anthropic Claude Sonnet 4.5 or OpenAI o3 (configurable)
- **UI**: Radix UI + shadcn/ui components, Tailwind CSS 4
- **File Parsing**: pdf-parse (PDF), mammoth (DOCX)

## Getting Started

### Prerequisites
- Node.js 18+
- An Anthropic or OpenAI API key

### Setup

```bash
# Install dependencies
npm install

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate deploy

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and go to **Settings** to configure your AI provider and API key.

### First Steps
1. Go to **Settings** → add your API key (Anthropic or OpenAI)
2. Go to **Profile** → describe your background so AI has context
3. Go to **Projects** → add descriptions of major projects you've worked on
4. Go to **Upload** → upload 1-2 past resumes to seed your bullet bank
5. Go to **Builder** → paste a job description and start building
