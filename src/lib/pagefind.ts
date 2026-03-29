import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { createIndex, type PagefindServiceConfig } from 'pagefind';
import sirv from 'sirv';

interface PagefindIntegrationConfig {
  serviceConfig?: PagefindServiceConfig;
}

export default function pagefindIntegration({
  serviceConfig,
}: PagefindIntegrationConfig = {}): AstroIntegration {
  let pathname: string;
  return {
    name: 'pagefind',
    hooks: {
      'astro:config:done': ({ config }) => {
        pathname = config.outDir.pathname;
      },
      'astro:server:setup': async ({ server }) => {
        const serve = sirv(`${pathname}client/`, { dev: true, etag: true });
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/pagefind/')) {
            serve(req, res, next);
          } else {
            next();
          }
        });
      },
      'astro:build:done': async ({ dir, logger }) => {
        const logErrors = (errors: string[]) =>
          errors.forEach((error) => void logger.error(error));

        const { index, errors: createErrors } =
          await createIndex(serviceConfig);
        if (!index) {
          logErrors(createErrors);
          return;
        }

        const { page_count: count, errors: addErrors } =
          await index.addDirectory({
            path: fileURLToPath(dir),
          });
        if (addErrors.length) {
          logErrors(addErrors);
        } else {
          logger.info(`Indexed ${count} pages`);
        }

        const { outputPath, errors: writeErrors } = await index.writeFiles({
          outputPath: fileURLToPath(new URL('./pagefind', dir)),
        });
        if (writeErrors.length) {
          logErrors(writeErrors);
        } else {
          logger.info(`Wrote index to ${outputPath}`);
        }
      },
    },
  };
}
