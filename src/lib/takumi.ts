import { readFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AstroIntegration } from 'astro';
import { fromJsx } from 'takumi-js/helpers/jsx';
import { Renderer, type RenderOptions } from 'takumi-js/node';
import OGImage, { type OGImageProps } from '../components/OGImage';

const font = readFileSync('./public/fonts/SourceSans3-VariableFont_wght.ttf');
const backgroundImage = readFileSync('./public/bg.svg');

const renderer = new Renderer({
  fonts: [{ name: 'Source Sans 3', data: font }],
  persistentImages: [{ src: 'background', data: backgroundImage }],
});

interface TakumiIntegrationConfig {
  renderOptions?: RenderOptions;
}

const defaultRenderOptions: RenderOptions = {
  width: 1200,
  height: 630,
  format: 'webp',
};

async function renderImage(html: string, renderOptions: RenderOptions) {
  const metadataText = html
    .split('<script data-page-metadata type="application/json">')[1]
    .split('</script>')[0];
  const metadata = JSON.parse(metadataText) as OGImageProps;
  const { node } = await fromJsx(OGImage(metadata));
  return await renderer.render(node, renderOptions);
}

export default function takumiIntegration(
  { renderOptions = defaultRenderOptions }: TakumiIntegrationConfig = {
    renderOptions: defaultRenderOptions,
  },
): AstroIntegration {
  let scheme: string;
  return {
    name: 'takumi',
    hooks: {
      'astro:config:done': ({ config }) => {
        scheme = config.vite.server?.https ? 'https' : 'http';
      },
      'astro:server:setup': async ({ server }) => {
        server.middlewares.use(async (req, res, next) => {
          const render = async () => {
            if (!req.url?.endsWith('/og.webp')) return next();
            const path = req.url!.replace(/\/?og.webp\/?$/, '');
            const htmlUrl = new URL(path, `${scheme}://${req.headers.host}`);
            const html = await fetch(htmlUrl).then((res) => res.text());
            return await renderImage(html, renderOptions);
          };
          render()
            .then((image) => image && res.write(image))
            .catch((error) => res.write(`Error: ${error}`))
            .finally(() => res.end());
        });
      },
      'astro:build:done': async ({ dir, pages, logger }) => {
        logger.info('Rendering OG images…');
        const render = async (page: { pathname: string }) => {
          const pageDir = path.join(dir.pathname, page.pathname);
          const htmlPath = path.join(pageDir, 'index.html');
          const html = (await readFile(htmlPath)).toString();
          const image = await renderImage(html, renderOptions);
          const imagePath = path.join(pageDir, `og.${renderOptions.format}`);
          await writeFile(imagePath, image);
          logger.info(page.pathname || '(root)');
          return image;
        };
        const images = await Promise.allSettled(
          pages.map(async (page) =>
            render(page).catch((error) =>
              logger.error(`Error for ${page.pathname}. Reason: ${error}`),
            ),
          ),
        );
        logger.info(`Rendered ${images.length} images.`);
      },
    },
  };
}
