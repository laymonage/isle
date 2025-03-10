import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { type PagefindServiceConfig, createIndex } from 'pagefind';
import sirv from 'sirv';

// Vendored from
// https://github.com/shishkin/astro-pagefind/pull/114

/**
 * Pagefind Astro integration options.
 */
export interface PagefindOptions {
  /**
   * `PagefindServiceConfig` passed to pagefind's `createIndex`
   */
  indexConfig?: PagefindServiceConfig;
}

export default function pagefind({
  indexConfig,
}: PagefindOptions = {}): AstroIntegration {
  return {
    name: 'pagefind',
    hooks: {
      'astro:config:setup': ({ config, logger }) => {
        if (config.output === 'server') {
          logger.warn(
            'Output type `server` does not produce static *.html pages in its output and thus will not work with astro-pagefind integration.',
          );
        }
      },
      'astro:server:setup': ({ server, logger }) => {
        const outDir = path.join(
          server.config.root,
          server.config.build.outDir,
        );
        logger.debug(`Serving pagefind from ${outDir}`);
        const serve = sirv(outDir, {
          dev: true,
          etag: true,
        });
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/pagefind/')) {
            serve(req, res, next);
          } else {
            next();
          }
        });
      },
      'astro:build:done': async ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);
        const { index, errors: createErrors } = await createIndex(indexConfig);
        if (!index) {
          logger.error('Pagefind failed to create index');
          // biome-ignore lint/complexity/noForEach: code is vendored
          createErrors.forEach((e) => logger.error(e));
          return;
        }
        const { page_count, errors: addErrors } = await index.addDirectory({
          path: outDir,
        });
        if (addErrors.length) {
          logger.error('Pagefind failed to index files');
          // biome-ignore lint/complexity/noForEach: code is vendored
          addErrors.forEach((e) => logger.error(e));
          return;
          // biome-ignore lint/style/noUselessElse: code is vendored
        } else {
          logger.info(`Pagefind indexed ${page_count} pages`);
        }
        const { outputPath, errors: writeErrors } = await index.writeFiles({
          outputPath: path.join(outDir, 'pagefind'),
        });
        if (writeErrors.length) {
          logger.error('Pagefind failed to write index');
          // biome-ignore lint/complexity/noForEach: code is vendored
          writeErrors.forEach((e) => logger.error(e));
          return;
          // biome-ignore lint/style/noUselessElse: code is vendored
        } else {
          logger.info(`Pagefind wrote index to ${outputPath}`);
        }
      },
    },
  };
}
