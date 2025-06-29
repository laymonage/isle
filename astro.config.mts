import mdx from '@astrojs/mdx';
import react from '@astrojs/react';

import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import icon from 'astro-icon';

import pagefind from 'astro-pagefind';
import { astroOgImagesGenerator } from 'og-images-generator/astro';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import { copyButton } from './src/lib/shiki';
import remarkToc from './src/lib/toc';

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
    astroOgImagesGenerator({
      base: './dist/client',
      out: './dist/client/og',
      json: './dist/client/og/index.json',
    }),
  ],
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
      transformers: [copyButton()],
    },
    remarkPlugins: [[remarkToc, { maxDepth: 3, className: 'toc' }]],
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'prepend',
          content: {
            type: 'text',
            value: '#',
          },
          headingProperties: {
            className: ['anchor'],
          },
          properties: {
            className: ['anchor-link'],
          },
        },
      ],
    ],
  },
  vite: {
    resolve: {
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    },
    plugins: [tailwindcss()],
  },
  adapter: vercel(),
});
