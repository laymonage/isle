// ./og-images.config.js

import { readFileSync } from 'node:fs';
import { OG_SIZE, fetchFont, html, styled } from 'og-images-generator';

/** @type {import('og-images-generator').PathsOptions} (Optional) */
export const paths = process.env.VERCEL
  ? {
      base: './.vercel/output/static/',
      out: './.vercel/output/static/og',
      json: './.vercel/output/static/og/index.json',
    }
  : {
      // DEFAULTS:
      base: './dist',
      out: './dist/og',
      json: './dist/og/index.json',
    };

const backgroundImage = readFileSync('./public/bg.svg', {
  encoding: 'base64',
});

const container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: flex-start;
  min-height: 100%;
  padding: 4rem;
  color: white;
  background-image: url('data:image/svg+xml;base64,${backgroundImage}');
  background-color: rgb(17, 24, 39);
  background-position: 60% 42%;
  background-repeat: no-repeat;
  border-left: 1.5rem solid rgb(71, 85, 105);
`;

const title = styled.div`
  font-size: 4.5rem;
  font-weight: 600;
  letter-spacing: -0.042em;
`;

const description = styled.div`
  font-size: 2.25rem;
  letter-spacing: -0.042em;
`;

/** @type {import('og-images-generator').Template} */
export const template = ({ page: { path, meta } }) =>
  html`<div style=${container}>
    <h1 style=${title}>
      ${
        path === 'index.html'
          ? `laymonage's personal website`
          : (meta?.tags?.['og:title'] ?? 'Untitled')
      }
    </h1>
    <p style=${description}>laymonage.com${(
      `/${
        path.endsWith('index.html')
          ? path.slice(0, 'index.html'.length * -1)
          : path
      }`
    ).slice(0, -1)}</p>
  </div>`;

const fonts = [
  {
    name: 'Source Sans Pro',
    url: 'https://cdn.jsdelivr.net/fontsource/fonts/source-sans-pro@latest/latin-400-normal.ttf',
    weight: 400,
  },
  {
    name: 'Source Sans Pro',
    url: 'https://cdn.jsdelivr.net/fontsource/fonts/source-sans-pro@latest/latin-600-normal.ttf',
    weight: 600,
  },
];

/** @type {import('og-images-generator').RenderOptions} */
export const renderOptions = {
  satori: {
    fonts: await Promise.all(
      fonts.map(async ({ name, weight, url }) => ({
        name,
        weight,
        data: await fetchFont(url),
      })),
    ),
    ...OG_SIZE,
  },
};
