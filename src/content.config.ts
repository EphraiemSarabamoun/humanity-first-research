import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// A single bibliography entry, derived from a project's references.bib by the
// publish adapter. The `annote` is the "why we cite this" line from the
// citation-discipline convention; it is rendered, muted, in the references block.
const reference = z.object({
  key: z.string(),
  authors: z.string(),
  year: z.string(),
  title: z.string(),
  eprint: z.string().optional(), // arXiv id, e.g. "2305.04388"
  doi: z.string().optional(),
  annote: z.string().optional(),
});

// Research posts. Folder-per-post: src/content/research/<slug>/index.mdx with the
// figure, its CSV, and the data bundle colocated. This schema is simultaneously
// the site's type system, the contract the publish adapter must satisfy, and the
// CI build-gate: a malformed post fails `astro build` and never reaches main.
const research = defineCollection({
  loader: glob({ pattern: '**/index.{md,mdx}', base: './src/content/research' }),
  schema: ({ image }) =>
    z.object({
      // identity / feed
      title: z.string(),
      subtitle: z.string().optional(),
      date: z.coerce.date(),
      summary: z.string().min(40),
      tags: z.array(z.string()).default([]),
      stage: z
        .enum(['scope', 'design', 'run', 'write', 'shipped'])
        .default('write'),
      status: z.string().optional(),

      // provenance — honest by construction. Most posts are autonomously
      // published and unreviewed; the review fields stay unset in that case and
      // the ProvenanceBanner says so plainly.
      generated_by: z
        .string()
        .default('Claudius Maximus (autonomous research agent)'),
      ai_generated: z.literal(true).default(true),
      human_reviewed_by: z.string().optional(),
      human_reviewed_at: z.coerce.date().optional(),
      review_note: z.string().optional(),
      // 'none' = autonomous/unreviewed (default), 'limited' = a human read it but
      // did not fully vet, 'full' = reviewed and signed off.
      review_level: z.enum(['none', 'limited', 'full']).default('none'),

      // run provenance / reproducibility
      run_id: z.string().optional(),
      compute: z.string().optional(),
      collaborators: z.array(z.string()).default([]),

      // assets (colocated, relative to the post folder)
      hero: image().optional(), // figure_main.png — validated as a real image at build
      hero_csv: z.string().optional(), // "curve.csv" — the plot's data (ships with the plot)
      data_files: z.array(z.string()).default([]),

      // external links
      links: z
        .object({
          github: z.string().url().optional(),
          overleaf: z.string().url().optional(),
          arxiv: z.string().url().optional(),
          code_local: z.string().optional(), // informational, not a URL
        })
        .default({}),

      // citations, derived from references.bib
      references: z.array(reference).default([]),

      // lifecycle: the agent's self-hold valve. Default publishes.
      draft: z.boolean().default(false),
    }),
});

// Short milestone / changelog entries (e.g. "no-cue control folded in").
const log = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/log' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    related_post: z.string().optional(),
    ai_generated: z.boolean().default(true),
  }),
});

export const collections = { research, log };
