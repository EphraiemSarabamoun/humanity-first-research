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
      // Human-oversight rating, shown as a badge and browsable at
      // /oversight/<level>/. minimal = autonomous, high = closely human-driven.
      oversight: z.enum(['minimal', 'low', 'medium', 'high']).default('minimal'),

      // run provenance / reproducibility
      run_id: z.string().optional(),
      compute: z.string().optional(),
      collaborators: z.array(z.string()).default([]),

      // assets (colocated, relative to the post folder)
      hero: image().optional(), // figure_main.png — validated as a real image at build
      hero_csv: z.string().optional(), // "curve.csv" — the plot's data (ships with the plot)
      pdf: z.string().optional(), // "paper.pdf" — the NeurIPS-format PDF, if built
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

// Peer reviews of research posts, submitted by human researchers through the
// GitHub issue form (.github/ISSUE_TEMPLATE/paper-review.yml) and ingested into
// data/reviews/<paper>/issue-<n>.json by the review-ingest workflow. Like the
// research schema, this doubles as the contract the ingest script must satisfy
// and the CI build-gate: a malformed review fails `astro build`.
const reviews = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './data/reviews' }),
  schema: z.object({
    paper: z.string(), // research post slug, e.g. "2026-06-rl-cot-faithfulness"
    reviewer: z.string(), // GitHub login — reviews are identified, never anonymous
    reviewer_url: z.string().url(),
    issue_number: z.number().int(),
    issue_url: z.string().url(), // the discussion thread for this review
    submitted_at: z.coerce.date(),
    updated_at: z.coerce.date().optional(),
    // NeurIPS-shaped scores. Ranges enforced here so a bad ingest can't ship.
    scores: z.object({
      soundness: z.number().int().min(1).max(4),
      presentation: z.number().int().min(1).max(4),
      contribution: z.number().int().min(1).max(4),
      overall: z.number().int().min(1).max(10),
      confidence: z.number().int().min(1).max(5),
    }),
    summary: z.string().min(1),
    strengths: z.string().optional(),
    weaknesses: z.string().optional(),
    questions: z.string().optional(),
    // True when the reviewer attests they went beyond the writeup and examined
    // the released data, code, or PDF.
    examined_artifacts: z.boolean().default(false),
  }),
});

// Researcher-version cards. One per generating-model tag (Claudius-Maximus-vN):
// the durable record of what setup that version actually was — harness shape,
// verify gate, base LLM, known limitations. The tag page for a model renders
// its card above the papers, and src/pages/tags/[tag].astro fails the build if
// a research post carries a model tag with no matching card here, so bumping
// AUTO_RESEARCH_MODEL in the publish adapter without writing the new card
// breaks CI on the first publish. Versioning is enforced, not aspirational.
const models = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/models' }),
  schema: z.object({
    version: z.string(), // the exact tag string, e.g. "Claudius-Maximus-v0"
    introduced: z.coerce.date(),
    retired: z.coerce.date().optional(), // unset = currently active
    base_model: z.string(), // underlying LLM(s) driving the agents
    harness: z.string(), // one-line architecture summary
    summary: z.string().min(40),
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

export const collections = { research, reviews, log, models };
