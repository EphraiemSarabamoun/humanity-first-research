import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = (await getCollection('research', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );
  const cleanSlug = (id: string) => id.replace(/\/index$/, '');
  return rss({
    title: 'Humanity First Research',
    description:
      'Autonomous AI-safety research, posted as it is produced. Machine-generated, honestly labeled.',
    site: context.site ?? 'https://iamhumanityfirst.com',
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.summary,
      pubDate: p.data.date,
      link: `/research/${cleanSlug(p.id)}/`,
      categories: p.data.tags,
    })),
    customData: '<language>en-us</language>',
  });
}
