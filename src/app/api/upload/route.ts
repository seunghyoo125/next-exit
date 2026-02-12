import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseFile } from "@/lib/parsers";
import { parseResume } from "@/lib/ai/parse-resume";
import { classifyBullets } from "@/lib/ai/classify-bullets";
import { analyzeThemes } from "@/lib/ai/analyze-themes";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const targetCompany = (formData.get("targetCompany") as string) || "";
    const targetRole = (formData.get("targetRole") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const filename = file.name;
    const ext = filename.split(".").pop()?.toLowerCase();

    if (ext !== "pdf" && ext !== "docx") {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload PDF or DOCX." },
        { status: 400 }
      );
    }

    // Parse file to raw text
    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await parseFile(buffer, filename);

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from file" },
        { status: 400 }
      );
    }

    // Save resume record
    const resume = await prisma.resume.create({
      data: {
        filename,
        fileType: ext,
        rawText,
        targetCompany,
        targetRole,
      },
    });

    // AI: Extract bullets
    const parsedBullets = await parseResume(rawText);

    // Split by category — only experience bullets get classified
    const experienceBullets = parsedBullets.filter((b) => b.category === "experience");
    const otherBullets = parsedBullets.filter((b) => b.category !== "experience");

    // Fetch existing themes from DB for reuse
    const existingThemeRecords = await prisma.bullet.findMany({
      where: { category: "experience", theme: { not: "" } },
      distinct: ["theme"],
      select: { theme: true },
    });
    const existingThemes = existingThemeRecords.map((r) => r.theme);

    // AI: Classify experience bullets with roleLevel + theme
    const classifiedExperience = await classifyBullets(experienceBullets, existingThemes);

    // Merge classified experience + unclassified others
    const allParsed = [...classifiedExperience, ...otherBullets];

    // Save bullets to DB
    const savedBullets = await Promise.all(
      allParsed.map((bullet) =>
        prisma.bullet.create({
          data: {
            content: bullet.content,
            section: bullet.section,
            company: bullet.company,
            roleTitle: bullet.roleTitle,
            category: bullet.category,
            roleLevel: bullet.roleLevel || "",
            theme: bullet.theme || "",
            resumeId: resume.id,
          },
        })
      )
    );

    // Trigger theme analysis in the background so summaries are ready
    // when the user navigates to /bullets
    analyzeThemes().catch((err) =>
      console.error("Post-upload analysis failed:", err)
    );

    return NextResponse.json({
      resumeId: resume.id,
      bulletCount: savedBullets.length,
      filename,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
