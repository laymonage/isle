import { cp, readdir } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

import type { AstroIntegration } from 'astro';
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';

import sitemap from '@astrojs/sitemap';

import react from '@astrojs/react';

import tailwind from '@astrojs/tailwind';

import vercel from '@astrojs/vercel';

import icon from 'astro-icon';

import pagefind from 'astro-pagefind';

import rehypeSlug from 'rehype-slug';

import rehypeAutolinkHeadings from 'rehype-autolink-headings';

import { astroOgImagesGenerator } from 'og-images-generator/astro';

import { paths } from './og-images.config';
import { copyButton } from './src/lib/shiki';

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
    tailwind(),
    pagefind(),
    astroOgImagesGenerator(paths),
    sitemapCopier(),
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
  },
  adapter: vercel(),
});

function sitemapCopier(): AstroIntegration {
  // https://github.com/withastro/adapters/issues/445#issuecomment-2528370475
  return {
    name: 'sitemap-copier',
    hooks: {
      'astro:build:done': async ({ logger }) => {
        const buildLogger = logger.fork('sitemap-copier');
        buildLogger.info('Copying xml files from dist to vercel out');
        try {
          const files = await readdir('./dist/client');
          const xmlFiles = files.filter(
            (file) =>
              extname(file).toLowerCase() === '.xml' &&
              basename(file).toLowerCase().startsWith('sitemap'),
          );
          buildLogger.info(xmlFiles.join(', '));
          for (const file of xmlFiles) {
            const sourcePath = join('./dist/client', file);
            const destPath = join('./.vercel/output/static', file);
            await cp(sourcePath, destPath);
          }
          buildLogger.info('All XML files copied successfully');
        } catch (error) {
          buildLogger.error(`Error copying files: ${error}`);
        }
      },
    },
  };
}
