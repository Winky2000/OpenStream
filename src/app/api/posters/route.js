import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { readState } from '@/lib/store';

function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleSeeded(arr, seed) {
  const out = arr.slice();
  const rand = mulberry32(seed || 1);
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function fetchServerPosters({ baseUrl, apiKey, limit, includeItemTypes }) {
  const url = new URL(`${baseUrl.replace(/\/+$/, '')}/Items`);
  url.searchParams.set('Recursive', 'true');
  url.searchParams.set('IncludeItemTypes', includeItemTypes || 'Movie,Series');
  url.searchParams.set('SortBy', 'Random');
  url.searchParams.set('Limit', String(limit));
  url.searchParams.set('ImageTypeLimit', '1');
  url.searchParams.set('EnableImageTypes', 'Primary');
  url.searchParams.set('Fields', 'PrimaryImageAspectRatio');

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-Emby-Token': apiKey,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  const items = Array.isArray(data?.Items) ? data.Items : [];
  const posters = [];

  for (const item of items) {
    const id = item?.Id;
    const primaryTag = item?.ImageTags?.Primary;
    if (!id || !primaryTag) continue;

    const posterUrl = new URL(`${baseUrl.replace(/\/+$/, '')}/Items/${encodeURIComponent(id)}/Images/Primary`);
    posterUrl.searchParams.set('tag', String(primaryTag));
    posterUrl.searchParams.set('maxHeight', '300');
    posterUrl.searchParams.set('quality', '90');

    posters.push({
      url: posterUrl.toString(),
      title: String(item?.Name || ''),
    });
  }

  return posters;
}

export async function GET(req) {
  const session = await getSession();
  if (!session) return new NextResponse('Unauthorized.', { status: 401 });

  const url = new URL(req.url);
  const type = String(url.searchParams.get('type') || 'all').toLowerCase();
  const filterKey = type === 'movies' ? 'movies' : type === 'tv' ? 'tv' : 'all';

  const includeItemTypes =
    filterKey === 'movies' ? 'Movie' : filterKey === 'tv' ? 'Series' : 'Movie,Series';

  const state = readState();
  const enabledServers = (Array.isArray(state.servers) ? state.servers : []).filter(
    (s) => s && s.enabled && s.baseUrl && s.apiKey
  );

  if (enabledServers.length === 0) {
    return NextResponse.json({ posters: [] });
  }

  const desired = 25;
  const perServerBase = Math.ceil(desired / enabledServers.length);
  const perServerLimit = Math.min(50, Math.max(10, perServerBase * 3));

  const results = await Promise.all(
    enabledServers.map(async (s) => {
      const posters = await fetchServerPosters({
        baseUrl: String(s.baseUrl || ''),
        apiKey: String(s.apiKey || ''),
        limit: perServerLimit,
        includeItemTypes,
      });

      return posters.map((p) => ({
        ...p,
        serverId: String(s.id || ''),
        serverType: String(s.type || ''),
        serverName: String(s.name || ''),
      }));
    })
  );

  const combined = results.flat();
  const baseSeed = Number(session.iat || Date.now()) >>> 0;
  const seed = (baseSeed ^ (filterKey === 'movies' ? 0x6d2b79f5 : filterKey === 'tv' ? 0x9e3779b9 : 0x243f6a88)) >>> 0;
  const shuffled = shuffleSeeded(combined, seed);

  const out = [];
  const seen = new Set();
  for (const p of shuffled) {
    if (!p?.url) continue;
    if (seen.has(p.url)) continue;
    seen.add(p.url);
    out.push(p);
    if (out.length >= desired) break;
  }

  return NextResponse.json({ posters: out, filter: filterKey });
}
