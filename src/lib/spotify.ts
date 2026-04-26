/// <reference types="spotify-api" />

import { z } from 'astro/zod';

interface RefreshTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
}

export interface NowPlaying {
  isPlaying: boolean;
  title: string;
  artist: string;
  album: string;
  albumImageUrl: string;
  trackUrl: string;
}

const SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1';
const SPOTIFY_ACCOUNTS_BASE_URL = 'https://accounts.spotify.com';

const ENDPOINTS = {
  NOW_PLAYING: `${SPOTIFY_API_BASE_URL}/me/player/currently-playing`,
  TOKEN: `${SPOTIFY_ACCOUNTS_BASE_URL}/api/token`,
};

const clientId = import.meta.env.SPOTIFY_CLIENT_ID;
const clientSecret = import.meta.env.SPOTIFY_CLIENT_SECRET;
const refreshToken = import.meta.env.SPOTIFY_REFRESH_TOKEN;

// Authentication stuff

const getAccessToken = async (): Promise<RefreshTokenResponse> => {
  const auth = {
    basic: Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    refreshToken,
  };

  const response = await fetch(ENDPOINTS.TOKEN, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth.basic}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: auth.refreshToken,
    } as Record<string, string>),
  });

  return response.json();
};

// Utilities

// API functions

export const getNowPlaying = async () =>
  fetch(ENDPOINTS.NOW_PLAYING, {
    headers: {
      Authorization: `Bearer ${(await getAccessToken()).access_token}`,
    },
  });

// Adapter functions

export const adaptNowPlaying = (
  track: SpotifyApi.CurrentlyPlayingObject,
): NowPlaying => {
  const isPlaying = track.is_playing;
  let title = '';
  let artist = '';
  let album = '';
  let albumImageUrl = '';
  let trackUrl = '';

  // They stopped providing podcast details :(
  if (track.currently_playing_type === 'episode') {
    artist = 'Podcast';
    title = 'Now playing';
  }

  if (track.item) {
    title = track.item.name;
    trackUrl = track.item.external_urls.spotify;
    if ('artists' in track.item) {
      // Currently playing track
      artist = track.item.artists.map((artist) => artist.name).join(', ');
      album = track.item.album.name;
      albumImageUrl = track.item.album.images[0]?.url || '';
    } else {
      // Currently playing episode
      album = track.item.show.name;
      albumImageUrl = track.item.show.images[0]?.url || '';
    }
  }

  return {
    isPlaying,
    title,
    artist,
    album,
    albumImageUrl,
    trackUrl,
  };
};

// Palates stuff

export interface AddedTrack {
  added_at?: string;
  track: SpotifyApi.TrackObjectFull | null;
}

export const trackSchema = z.object({
  id: z.string().nullable(),
  name: z.string(),
  added_at: z.string(),
  popularity: z.number(),
  duration_ms: z.number(),
  explicit: z.boolean(),
  url: z.string().nullable(),
  preview_url: z.string().nullable().optional(),
  album: z.object({
    id: z.string().nullable(),
    name: z.string(),
    release_date: z.string().nullable(),
    image_url: z.string(),
    url: z.string().nullable(),
  }),
  artists: z.array(
    z.object({
      id: z.string().nullable(),
      name: z.string(),
      url: z.string().nullable(),
    }),
  ),
});

export type TrackSimplified = z.infer<typeof trackSchema>;

export const albumSchema = z.object({
  id: z.string(),
  name: z.string(),
  added_at: z.string(),
  type: z.string().nullable(),
  total_tracks: z.number().nullable(),
  url: z.string(),
  image_url: z.string(),
  release_date: z.string().nullable(),
  artists: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      url: z.string(),
    }),
  ),
  genres: z.array(z.string()).nullable(),
  popularity: z.number(),
});

export type AlbumSimplified = z.infer<typeof albumSchema>;

export type PlaylistFull = Omit<SpotifyApi.PlaylistObjectFull, 'tracks'> & {
  tracks: SpotifyApi.PlaylistTrackObject[];
};

const SPOTIFY_DATA_RAW_URL =
  'https://raw.githubusercontent.com/laymonage/spotify-to-github';
const SPOTIFY_DATA_BRANCH_URL = `${SPOTIFY_DATA_RAW_URL}/data/data`;

export function getSpotifyDataURL(filename: string, format = 'json') {
  return `${SPOTIFY_DATA_BRANCH_URL}/${filename}.${format}`;
}

export function simplifyPlaylistTrack({
  added_at,
  track,
}: AddedTrack): TrackSimplified {
  return simplifyTrack(track as SpotifyApi.TrackObjectFull, added_at);
}

export function simplifyTrack(
  t: SpotifyApi.TrackObjectFull,
  added_at = '1970-01-01',
): TrackSimplified {
  const url = t.external_urls.spotify || '';
  const album = {
    ...t.album,
    image_url:
      t.album.images[0]?.url ||
      'https://t.scdn.co/images/3099b3803ad9496896c43f22fe9be8c4.png',
    url: t.album.external_urls.spotify || '',
  };
  const artists = t.artists.map((artist) => ({
    ...artist,
    url: artist.external_urls.spotify || '',
  }));
  return { added_at, url, ...t, album, artists };
}
