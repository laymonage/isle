import type { APIRoute } from 'astro';

import {
  adaptNowPlaying,
  getNowPlaying,
  type NowPlaying,
} from '../../lib/spotify';

export const GET: APIRoute = async () => {
  const response = await getNowPlaying();
  let result: Record<string, boolean> | NowPlaying;

  if (response.status !== 200) {
    result = { isPlaying: false };
  } else {
    result = adaptNowPlaying(await response.json());
  }

  return new Response(JSON.stringify(result), {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    },
  });
};

export const prerender = false;
