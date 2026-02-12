import { NextRequest, NextResponse } from "next/server";
import { sanityCheck } from "@/lib/ai/sanity-check";
import { JDInterpretation, StrategyAssessment } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bullets, interpretation, strategyAssessment } = body as {
      bullets: {
        sectionRole: string;
        sectionCompany: string;
        text: string;
      }[];
      interpretation: JDInterpretation;
      strategyAssessment?: StrategyAssessment;
    };

    if (!interpretation || !bullets || bullets.length === 0) {
      return NextResponse.json(
        { error: "Interpretation and bullets are required" },
        { status: 400 }
      );
    }

    const result = await sanityCheck(
      bullets,
      interpretation,
      strategyAssessment || null
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Sanity check error:", error);
    return NextResponse.json(
      { error: "Failed to run sanity check" },
      { status: 500 }
    );
  }
}
