import { searchCities } from '../../../lib/cities';
export function GET(request: Request) {
  const results = searchCities(new URL(request.url).searchParams.get('q') || '');
  return Response.json(results, {
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
