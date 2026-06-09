// Ingest a peer review submitted through the paper-review issue form into
// data/reviews/<paper>/issue-<n>.json, where the site's `reviews` content
// collection picks it up. Runs inside .github/workflows/review-ingest.yml on
// `issues: [opened, edited]`; reads the event payload, never the API.
//
// The issue body is UNTRUSTED INPUT. It is parsed into plain JSON string
// fields and never evaluated; Astro escapes everything at render time.
//
// On validation failure the script writes a human-readable error to
// $GITHUB_OUTPUT (`error=`) and exits 1; the workflow comments it back onto
// the issue so the reviewer can fix and resubmit by editing.

import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

// Issue-form section heading -> output field. Headings are the `label` values
// in .github/ISSUE_TEMPLATE/paper-review.yml; keep the two in sync.
const FIELD_MAP = {
  'Paper slug': 'paper_slug',
  'Summary': 'summary',
  'Strengths': 'strengths',
  'Weaknesses': 'weaknesses',
  'Questions and suggestions': 'questions',
  'Soundness': 'soundness',
  'Presentation': 'presentation',
  'Contribution': 'contribution',
  'Overall score': 'overall',
  'Confidence': 'confidence',
  'Attestation': 'attestation',
};

const SCORE_RANGES = {
  soundness: [1, 4],
  presentation: [1, 4],
  contribution: [1, 4],
  overall: [1, 10],
  confidence: [1, 5],
};

function parseSections(body) {
  // Issue-form bodies render as "### <Label>\n\n<value>" blocks. Optional
  // fields left blank render their value as "_No response_".
  const sections = {};
  let current = null;
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^### (.+?)\s*$/);
    if (m) {
      current = m[1];
      sections[current] = [];
    } else if (current) {
      sections[current].push(line);
    }
  }
  const out = {};
  for (const [heading, fieldLines] of Object.entries(sections)) {
    const field = FIELD_MAP[heading];
    if (!field) continue;
    let value = fieldLines.join('\n').trim();
    if (value === '_No response_') value = '';
    out[field] = value;
  }
  return out;
}

function setOutput(key, value) {
  if (process.env.GITHUB_OUTPUT) {
    // Multiline-safe heredoc form.
    appendFileSync(process.env.GITHUB_OUTPUT, `${key}<<__EOF__\n${value}\n__EOF__\n`);
  }
}

function fail(errors) {
  const message = errors.map((e) => `- ${e}`).join('\n');
  setOutput('error', message);
  console.error(`Validation failed:\n${message}`);
  process.exit(1);
}

const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const issue = event.issue;
if (!issue) {
  fail(['No issue found in the event payload.']);
}

const fields = parseSections(issue.body ?? '');
const errors = [];

// Paper slug: must look like a slug and must name an existing post.
const slug = (fields.paper_slug ?? '').trim();
if (!/^[a-z0-9][a-z0-9_-]*$/i.test(slug)) {
  errors.push(`Paper slug \`${slug || '(empty)'}\` is not a valid slug.`);
} else if (!existsSync(join('src/content/research', slug))) {
  errors.push(
    `No paper found for slug \`${slug}\`. The slug is the path segment after /research/ in the paper URL.`
  );
}

// Scores: each dropdown value starts with its integer ("8 (strong)").
const scores = {};
for (const [key, [min, max]] of Object.entries(SCORE_RANGES)) {
  const raw = (fields[key] ?? '').trim();
  const n = parseInt(raw, 10);
  if (!Number.isInteger(n) || n < min || n > max) {
    errors.push(`Score \`${key}\` is missing or out of range (${min}-${max}): got \`${raw || '(empty)'}\`.`);
  } else {
    scores[key] = n;
  }
}

// Summary is the one required text field.
if (!(fields.summary ?? '').trim()) {
  errors.push('Summary is required.');
}

// Attestation checkboxes render as "- [x] <label>" lines.
const attestation = fields.attestation ?? '';
const humanAttested = /- \[x\] I am a human/i.test(attestation);
const examinedArtifacts = /- \[x\] I examined the released/i.test(attestation);
if (!humanAttested) {
  errors.push('The human-reviewer attestation checkbox must be checked.');
}

if (errors.length > 0) fail(errors);

const review = {
  paper: slug,
  reviewer: issue.user.login,
  reviewer_url: issue.user.html_url,
  issue_number: issue.number,
  issue_url: issue.html_url,
  submitted_at: issue.created_at,
  updated_at: issue.updated_at,
  scores,
  summary: fields.summary.trim(),
  strengths: (fields.strengths ?? '').trim() || undefined,
  weaknesses: (fields.weaknesses ?? '').trim() || undefined,
  questions: (fields.questions ?? '').trim() || undefined,
  examined_artifacts: examinedArtifacts,
};

const dir = join('data/reviews', slug);
mkdirSync(dir, { recursive: true });
const outPath = join(dir, `issue-${issue.number}.json`);
writeFileSync(outPath, JSON.stringify(review, null, 2) + '\n');

setOutput('slug', slug);
setOutput('path', outPath);
setOutput('reviewer', issue.user.login);
console.log(`Wrote ${outPath}`);
