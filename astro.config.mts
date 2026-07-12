import { satteri, satteriHeadingIdsPlugin } from '@astrojs/markdown-satteri';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import icon from 'astro-icon';

import satteriAutolinkHeadings from './src/lib/autolink-headings';
import pagefind from './src/lib/pagefind';
import { copyButton } from './src/lib/shiki';
import takumi from './src/lib/takumi';
import satteriToc from './src/lib/toc';

// https://astro.build/config
export default defineConfig({
  site: 'https://laymonage.com',
  integrations: [
    mdx(),
    sitemap({
      priority: 0.5,
      serialize(item) {
        const priorityMap = {
          0.1: [
            /\/palates\/music\/playlists\/[\w-]+\//,
            /\/palates\/music\/top\//,
          ],
          0.2: [/\/logs\/$/, /\/logs\/2[1,2]w[0-9]{2}\/$/],
          0.3: [/\/guestbook\/$/],
        };
        for (const [priority, urls] of Object.entries(priorityMap)) {
          for (const url of urls) {
            if (url.test(item.url)) {
              item.priority = +priority;
            }
          }
        }
        return item;
      },
      xslURL: '/sitemap.xsl',
    }),
    react(),
    icon(),
    pagefind(),
    takumi(),
  ],
  markdown: {
    processor: satteri({
      mdastPlugins: [
        satteriToc({
          heading: 'Table of contents',
          tight: true,
          maxDepth: 3,
          className: 'toc',
        }),
      ],
      hastPlugins: [
        satteriHeadingIdsPlugin(),
        satteriAutolinkHeadings({
          content: '#',
          ignore: /table-of-contents/i,
          headingClassName: ['anchor'],
          linkClassName: ['anchor-link'],
        }),
      ],
    }),
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
      transformers: [copyButton()],
    },
  },
  vite: {
    resolve: {
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    },
    plugins: [tailwindcss()],
  },
  adapter: vercel(),
});
