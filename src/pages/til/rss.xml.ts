import type { APIContext } from 'astro';
import { rss } from '../../content/rss';

export async function GET(context: APIContext) {
  return rss('tils', context);
}
