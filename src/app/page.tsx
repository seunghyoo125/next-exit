import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [bulletCount, resumeCount, themeRecords, builtResumeCount] =
    await Promise.all([
      prisma.bullet.count(),
      prisma.resume.count(),
      prisma.bullet.findMany({
        where: { theme: { not: "" } },
        distinct: ["theme"],
        select: { theme: true },
      }),
      prisma.builtResume.count(),
    ]);

  const themeCount = themeRecords.length;

  const recentResumes = await prisma.resume.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, filename: true, createdAt: true },
  });

  const stats = [
    { label: "Total Bullets", value: bulletCount },
    { label: "Uploaded Resumes", value: resumeCount },
    { label: "Themes", value: themeCount },
    { label: "Built Resumes", value: builtResumeCount },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your resume bullet bank
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild>
              <Link href="/upload">Upload Resume</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/bullets">Browse Bullets</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/builder">Build Resume</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            {recentResumes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No resumes uploaded yet.{" "}
                <Link href="/upload" className="underline">
                  Upload one
                </Link>
                .
              </p>
            ) : (
              <ul className="space-y-2">
                {recentResumes.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium truncate">{r.filename}</span>
                    <span className="text-muted-foreground text-xs">
                      {r.createdAt.toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
