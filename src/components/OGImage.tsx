import type { CSSProperties } from 'react';

export interface OGImageProps {
  title?: string;
  url?: string;
}

export default function OGImage({
  title = "laymonage's personal website",
  url = '',
}: OGImageProps = {}) {
  const style: CSSProperties = {
    backgroundImage: 'url(background)',
    fontFamily: "'Source Sans 3'",
  };
  return (
    <div
      tw="w-full h-full flex flex-col justify-end items-start p-8 bg-[rgb(17,24,39)] bg-position-[-100%_0%] bg-repeat-y border-l-24 border-[rgb(71,85,105)] border-solid text-white"
      style={style}
    >
      <h1 className="" tw="text-7xl font-semibold tracking-[-0.042em] mb-0">
        {title}
      </h1>
      <p tw="text-4xl">{url}</p>
    </div>
  );
}
