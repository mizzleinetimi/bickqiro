import { getLiveBicksForSitemap, getAllTags } from '@/lib/supabase/queries';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bickqr.com';
  
  // Fetch all live bicks (paginated)
  const allBicks: { id: string; slug: string; updated_at: string }[] = [];
  let cursor: string | undefined;
  
  do {
    const { bicks, nextCursor } = await getLiveBicksForSitemap(cursor);
    allBicks.push(...bicks);
    cursor = nextCursor ?? undefined;
  } while (cursor);

  // Fetch all tags
  const tags = await getAllTags();

  const today = new Date().toISOString().split('T')[0];

  // Build sitemap XML
  const urls = [
    // Static pages
    { loc: baseUrl, lastmod: today },
    { loc: `${baseUrl}/trending`, lastmod: today },
    
    // Bick pages
    ...allBicks.map(bick => ({
      loc: `${baseUrl}/bick/${bick.slug}-${bick.id}`,
      lastmod: bick.updated_at.split('T')[0],
    })),
    
    // Tag pages
    ...tags.map(tag => ({
      loc: `${baseUrl}/tag/${tag.slug}`,
      lastmod: tag.created_at.split('T')[0],
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
