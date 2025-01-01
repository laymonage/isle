import {
  type AnyEntryMap,
  defineCollection,
  getCollection,
  z,
} from 'astro:content';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { rssSchema } from '@astrojs/rss';
import { file, glob } from 'astro/loaders';

const baseSchema = z.object({
  title: z.string(),
  description: z.string(),
  comments: z.boolean().or(z.literal('eager')).optional(),
});

const postsSchema = baseSchema.extend({
  date: z.coerce.date(),
  draft: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  image: z.string().optional(),
});

const gsoc = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './content/gsoc' }),
  schema: postsSchema,
});

const posts = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './content/posts' }),
  schema: postsSchema,
});

const thoughts = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './content/thoughts' }),
  schema: postsSchema,
});

type ContentTypeWithDate = 'gsoc' | 'posts' | 'thoughts';

export const getSortedCollection = async (collection: ContentTypeWithDate) =>
  (await getCollection(collection)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );

// Logs

export const parseLogSlug = (slug: string) => {
  const [year, week] = slug.split('w');
  return { year: +`20${year}`, week: +week };
};

export const humanizeLogSlug = (slug: string) => {
  const { year, week } = parseLogSlug(slug);
  return `${year} Week ${week}`;
};

const logs = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './content/logs' }),
  schema: baseSchema,
});

// Replace with Object.groupBy when Node 22 is fully supported
export const groupBy = <T>(
  arr: T[],
  key: (item: T) => string,
): { [key: string]: T[] } =>
  arr.reduce((acc, current) => {
    const groupingKey = key(current);
    acc[groupingKey] = acc[groupingKey] || [];
    acc[groupingKey].push(current);
    return acc;
  }, Object.create(null));

export const getGroupedLogs = async () =>
  Object.entries(
    groupBy(
      (await getCollection('logs'))
        .map((log) => ({
          ...log,
          data: { ...log.data, ...parseLogSlug(log.id) },
        }))
        .sort((a, b) => b.data.year - a.data.year || b.data.week - a.data.week),
      ({ data: { year } }) => year.toString(),
    ),
  ).sort(([a], [b]) => +b - +a);

const palates = defineCollection({
  loader: glob({ pattern: '**/[^_]*.mdx', base: './content/palates' }),
  schema: baseSchema,
});

export const getContentStaticPaths = async <C extends keyof AnyEntryMap>(
  collection: C,
) =>
  (await getCollection(collection)).map((entry) => ({
    params: { slug: entry.id === 'index' ? undefined : entry.id },
    props: entry,
  }));

export const sortFeedItems = (items: z.infer<typeof rssSchema>[]) =>
  items.sort(
    (a, b) => (b.pubDate?.valueOf() || 0) - (a.pubDate?.valueOf() || 0),
  );

type FeedContentType = 'posts' | 'thoughts';

export const getRssItems = async (collection: FeedContentType) =>
  sortFeedItems(
    (await getCollection(collection)).map((entry) =>
      rssSchema.parse({
        title: entry.data.title,
        description: entry.data.description,
        pubDate: entry.data.date,
        link: `${String(collection)}/${entry.id}`,
      }),
    ),
  );

const timelineYearSchema = z.object({
  id: z.number(),
  items: z.array(
    z.object({
      emoji: z.string(),
      title: z.string(),
      description: z.string(),
    }),
  ),
});

export type TimelineYear = z.infer<typeof timelineYearSchema>;

const about = defineCollection({
  loader: file('./src/content/data/about.json'),
  schema: timelineYearSchema,
});

const projectSchema = z.object({
  id: z.number(),
  shown: z.boolean(),
  image: z.object({
    src: z.string(),
    lowContrast: z.boolean().optional(),
  }),
  title: z.string(),
  url: z.string(),
  description: z.string(),
  details: z.array(z.string()),
});

const projectGroupSchema = z.object({
  id: z.number(),
  shown: z.boolean(),
  type: z.string(),
  anchor: z.string(),
  data: z.array(projectSchema),
});

const projects = defineCollection({
  loader: file('./src/content/data/projects.json'),
  schema: projectGroupSchema,
});

const markdownProcessor = createMarkdownProcessor();

export const md = async (content: string) =>
  (await (await markdownProcessor).render(content)).code;

export const collections = {
  gsoc,
  logs,
  posts,
  thoughts,
  about,
  projects,
  palates,
};
