import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { programHref } from "@/lib/programs";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://volunteer.fairfood.org.nz";

// Render on-request, not at build time: the build job has no DB and the
// programme list is sourced from Prisma.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const programmes = await db.program.findMany({
    where: { active: true },
    select: { slug: true, updatedAt: true },
  });

  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/programs`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/shifts`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/resources`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  const programmeEntries: MetadataRoute.Sitemap = programmes.map((p) => ({
    url: `${BASE_URL}${programHref(p.slug)}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...programmeEntries];
}
