import type { MetadataRoute } from 'next';
import { sql } from '@/lib/db';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000');

  const rows = (await sql`
    SELECT id FROM entries
    WHERE longevity_influence IN ('pro_longevity', 'anti_longevity', 'unclear')
    ORDER BY id
  `) as unknown as { id: number }[];

  const entryUrls: MetadataRoute.Sitemap = rows.map(r => ({
    url: `${base}/entry/${r.id}`,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  return [
    { url: base, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/entry`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/methodology`, changeFrequency: 'monthly', priority: 0.7 },
    ...entryUrls,
  ];
}
