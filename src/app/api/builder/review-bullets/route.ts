import { NextRequest, NextResponse } from "next/server";
import { reviewBullets } from "@/lib/ai/review-bullets";
import { JDInterpretation, StrategyAssessment } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bullets, interpretation, strategyAssessment, userNotes } = body as {
      bullets: {
        bulletId: string;
        content: string;
        sectionRole: string;
        sectionCompany: string;
      }[];
      interpretation: JDInterpretation;
      strategyAssessment?: StrategyAssessment;
      userNotes?: string;
    };

    if (!interpretation || !bullets || bullets.length === 0) {
      return NextResponse.json(
        { error: "Interpretation and bullets are required" },
        { status: 400 }
      );
    }

    const reviews = await reviewBullets(
      bullets,
      interpretation,
      strategyAssessment || null,
      userNotes || ""
    );

    return NextResponse.json(reviews);
  } catch (error) {
    console.error("Review bullets error:", error);
    return NextResponse.json(
      { error: "Failed to review bullets" },
      { status: 500 }
    );
  }
}
