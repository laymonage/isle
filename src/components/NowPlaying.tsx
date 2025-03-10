import clsx from 'clsx';
import useSWR from 'swr';
import { fetcher } from '../lib/fetcher';
import type { NowPlaying as NowPlayingData } from '../lib/spotify';

const SPOTIFY_PROFILE_URL = 'https://open.spotify.com/user/laymonage';

export default function NowPlaying({ icon }: { icon?: astroHTML.JSX.Element }) {
  const { data } = useSWR<NowPlayingData>('/api/now-playing', fetcher);
  const isPlaying = data?.isPlaying;

  return (
    <a
      className="ml-auto flex min-h-[56px] max-w-full items-center"
      href={isPlaying ? data?.trackUrl : SPOTIFY_PROFILE_URL}
      target="_blank"
      rel="noopener noreferrer nofollow"
    >
      <div className="mr-4 flex flex-col truncate text-right">
        {data && isPlaying ? (
          <>
            <p className="truncate">{data.artist}</p>
            <p className="truncate">{data.title}</p>
          </>
        ) : (
          <p>Not playing</p>
        )}
      </div>
      {icon ? (
        <div
          className={clsx('shrink-0', {
            'h-8 w-8': isPlaying,
            'h-6 w-6': !isPlaying,
          })}
        >
          {icon}
        </div>
      ) : null}
    </a>
  );
}
