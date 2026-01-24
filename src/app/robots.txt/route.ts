export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bickqr.com';
  
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /search
Disallow: /embed/

Sitemap: ${baseUrl}/sitemap.xml
`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
