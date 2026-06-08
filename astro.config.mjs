// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// Canonical site URL. Required for absolute URLs in the sitemap + RSS feed.
// No `base` is set because the site is served at the apex custom domain
// (iamhumanityfirst.com), not at a github.io/<repo> subpath.
export default defineConfig({
  site: 'https://iamhumanityfirst.com',
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: { theme: 'github-light', wrap: true },
  },
});
