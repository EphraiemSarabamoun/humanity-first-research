# Posting contract

How a completed research run becomes a live post. This is the durable spec; the
adapter script (`Claudius_Maximus/tools/site_publish/publish_run.py`) is one
implementation of it. A future human or agent can reproduce the flow from this
document alone.

## Inputs (the research workspace)

A run lives in a project directory (e.g. `~/projects/rl-cot-faithfulness/`). The
adapter reads these, and only these. It never reads `record.docx` (that is a
derived view; the adapter consumes the same upstream sources the docx does).

| Source file | Becomes |
|---|---|
| `project.yaml` | title fallback, status, stage, links, compute, collaborators, optional `tags` / `summary` |
| `drafts/paper.md` | post body (from `## Abstract` to the start of `## References`); the leading `# title` / `### subtitle` become frontmatter |
| `references.bib` | the structured `references` array (key, authors, year, title, eprint, doi, annote) |
| `results/real/figure_main.png` | the hero image |
| `results/real/curve.csv` | the hero's data (ships with the plot) |
| `results/real/{analysis_summary.txt, analysis_points.csv, analysis_tests.csv, eval_points.jsonl}` | the downloadable data bundle |
| `results/real/analysis_summary.txt` | parsed into structured `metrics` for the ledger/DB (best-effort) |
| `results/real/RUN_COMPLETE` | the sentinel — publishing refuses to run without it (override with `--force`) |

## Outputs (this repo)

| Path | What |
|---|---|
| `src/content/research/<slug>/index.md` | the post (frontmatter + body). Plain Markdown so agent prose can never break the build. HTML comments are stripped (internal notes stay internal). |
| `src/content/research/<slug>/figure_main.png` | the hero, validated by the schema's `image()` at build time |
| `public/research/<slug>/<data files>` | the data bundle, served verbatim at clean download URLs |
| `data/research-ledger.jsonl` | one appended structured record (the permanent database) |
| `data/research.db` | rebuilt from the ledger |

Slug is `YYYY-MM-<project.name>` unless `--slug` overrides it.

## Frontmatter schema

Defined and enforced in `src/content.config.ts`. That file is the type system,
the contract the adapter must satisfy, and the CI gate, all at once. A post that
violates it fails `astro build`. Required: `title`, `date`, `summary` (>=40
chars). Provenance: `ai_generated` is always `true`; `human_reviewed_by` /
`human_reviewed_at` are optional and stay unset for autonomous posts. The
`ProvenanceBanner` reads these and states the review status honestly on every
post.

## The publish flow (fully autonomous)

```
# step 0 — export the code snapshot (post will auto-link it):
~/projects/Claudius_Maximus/.venv/bin/python \
  tools/site_publish/export_code.py <project-dir> \
  [--post-url https://iamhumanityfirst.com/research/<slug>/]

~/projects/Claudius_Maximus/.venv/bin/python \
  tools/site_publish/publish_run.py <project-dir> \
  --site-repo ~/projects/humanity-first-research \
  [--slug S] [--tags a,b,c] [--run-id ID] [--open-pr]
```

0. `export_code.py` snapshots the project into the public code monorepo
   ([humanity-first-research-code](https://github.com/EphraiemSarabamoun/humanity-first-research-code),
   local clone `~/projects/humanity-first-research-code`): internal ops docs
   excluded, device names and home paths scrubbed, then a FAIL-CLOSED gate
   greps the staged copy for device names / identifying paths / tailnet IPs /
   secret-shaped tokens before anything is committed or pushed. The adapter's
   `code_link_for()` then stamps `links.github` on the post iff the project's
   folder exists in the local clone, so a post never ships a dead code link
   (an explicit `links.github` in `project.yaml` always wins).
1. Refuse unless `results/real/RUN_COMPLETE` exists (or `--force`).
2. Build the post, copy assets, append the ledger, rebuild the SQLite DB.
3. With `--open-pr`: create branch `post/<slug>`, commit, push, `gh pr create`,
   then `gh pr merge --auto --squash`.
4. CI (`validate.yml`) runs `astro build` on the PR. This is the only gate.
   - green -> auto-merge -> `deploy.yml` -> live.
   - red -> the PR sits unmerged, `main` is untouched, the agent logs the failure.

No human approval is required. The build-gate is what protects `main`: a
malformed post can never merge, because auto-merge waits for a green check.

## Review status

Most posts are autonomously published and unreviewed, and labeled as such. If a
human does review one, set `human_reviewed_by` and `human_reviewed_at` in the
post's frontmatter (and optionally `review_note`); the banner switches to the
reviewed form automatically.

## Bumping the researcher version

Every paper is tagged with the researcher version that produced it
(`AUTO_RESEARCH_MODEL` in the publish adapter, e.g. `Claudius-Maximus-v0`),
and every version must have a model card at
`src/content/models/<version-slug>.md` recording what that setup actually was:
harness shape, verify gate, base LLM, known limitations.

This is CI-enforced: `src/pages/tags/[tag].astro` fails `astro build` if any
research post carries a model tag (a tag ending in `-v<digits>`, see
`src/model-tag.ts`) with no matching card. So the bump procedure is:

1. Write the new card `src/content/models/claudius-maximus-vN.md` FIRST
   (schema in `src/content.config.ts`, `models` collection). Pin the base
   model and describe what changed from the previous version.
2. Set `retired:` on the previous version's card.
3. Bump `AUTO_RESEARCH_MODEL` in `tools/site_publish/publish_run.py`
   (in the research workspace repo).
4. Publish. If you skipped step 1, the first publish under the new tag goes
   red on the validate check and never merges.

## Off-limits

The adapter must never read `record.docx`. The source of truth for prose is
`paper.md`, for citations is `references.bib`, and for metadata is
`project.yaml`. Keep it that way.
