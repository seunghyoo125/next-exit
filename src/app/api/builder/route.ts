import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      jobDescription,
      sections,
      draftId,
      interpretation,
      strategyAssessment,
      sanityCheck,
      status,
    } = body;

    // If updating an existing draft to complete
    if (draftId) {
      // Delete existing sections for this draft (rebuild from scratch)
      await prisma.builtResumeSection.deleteMany({
        where: { builtResumeId: draftId },
      });

      const updated = await prisma.builtResume.update({
        where: { id: draftId },
        data: {
          title,
          jobDescription,
          status: status || "complete",
          currentStep: 5,
          interpretation: interpretation ? JSON.stringify(interpretation) : undefined,
          strategyAssessment: strategyAssessment ? JSON.stringify(strategyAssessment) : undefined,
          sanityCheck: sanityCheck ? JSON.stringify(sanityCheck) : undefined,
          sections: {
            create: sections.map(
              (
                section: {
                  roleTitle: string;
                  company: string;
                  bulletCount: number;
                  bulletIds: string[];
                  bulletFinalTexts?: {
                    bulletId: string;
                    finalText: string;
                    reviewVerdict: string;
                    reviewFeedback: string;
                    suggestedText: string;
                    userDecision: string;
                  }[];
                },
                sIdx: number
              ) => ({
                roleTitle: section.roleTitle,
                company: section.company,
                bulletCount: section.bulletCount,
                sortOrder: sIdx,
                bullets: {
                  create: section.bulletIds.map((bulletId: string, bIdx: number) => {
                    const finalInfo = section.bulletFinalTexts?.find(
                      (f) => f.bulletId === bulletId
                    );
                    return {
                      bulletId,
                      sortOrder: bIdx,
                      finalText: finalInfo?.finalText || "",
                      reviewVerdict: finalInfo?.reviewVerdict || "",
                      reviewFeedback: finalInfo?.reviewFeedback || "",
                      suggestedText: finalInfo?.suggestedText || "",
                      userDecision: finalInfo?.userDecision || "",
                    };
                  }),
                },
              })
            ),
          },
        },
        include: {
          sections: {
            include: {
              bullets: {
                include: {
                  bullet: true,
                },
              },
            },
          },
        },
      });

      return NextResponse.json(updated);
    }

    // Original flow: create new build
    const builtResume = await prisma.builtResume.create({
      data: {
        title,
        jobDescription,
        status: status || "complete",
        interpretation: interpretation ? JSON.stringify(interpretation) : "",
        strategyAssessment: strategyAssessment ? JSON.stringify(strategyAssessment) : "",
        sanityCheck: sanityCheck ? JSON.stringify(sanityCheck) : "",
        sections: {
          create: sections.map(
            (
              section: {
                roleTitle: string;
                company: string;
                bulletCount: number;
                bulletIds: string[];
                bulletFinalTexts?: {
                  bulletId: string;
                  finalText: string;
                  reviewVerdict: string;
                  reviewFeedback: string;
                  suggestedText: string;
                  userDecision: string;
                }[];
              },
              sIdx: number
            ) => ({
              roleTitle: section.roleTitle,
              company: section.company,
              bulletCount: section.bulletCount,
              sortOrder: sIdx,
              bullets: {
                create: section.bulletIds.map((bulletId: string, bIdx: number) => {
                  const finalInfo = section.bulletFinalTexts?.find(
                    (f) => f.bulletId === bulletId
                  );
                  return {
                    bulletId,
                    sortOrder: bIdx,
                    finalText: finalInfo?.finalText || "",
                    reviewVerdict: finalInfo?.reviewVerdict || "",
                    reviewFeedback: finalInfo?.reviewFeedback || "",
                    suggestedText: finalInfo?.suggestedText || "",
                    userDecision: finalInfo?.userDecision || "",
                  };
                }),
              },
            })
          ),
        },
      },
      include: {
        sections: {
          include: {
            bullets: {
              include: {
                bullet: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(builtResume);
  } catch (error) {
    console.error("Save built resume error:", error);
    return NextResponse.json(
      { error: "Failed to save built resume" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const resumes = await prisma.builtResume.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: {
          bullets: {
            orderBy: { sortOrder: "asc" },
            include: {
              bullet: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json(resumes);
}
