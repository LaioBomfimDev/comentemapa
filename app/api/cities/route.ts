import { searchCities } from '../../../lib/cities';
export function GET(request: Request) { return Response.json(searchCities(new URL(request.url).searchParams.get('q') || '')); }
