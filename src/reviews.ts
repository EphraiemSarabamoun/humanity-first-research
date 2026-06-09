// Peer review — the single source of truth for the scoring axes, their ranges,
// and the repo the review issue forms live in. The shape follows the NeurIPS
// review form (soundness / presentation / contribution on 1-4, overall on 1-10,
// confidence on 1-5) so it reads as familiar to working researchers.

export const REPO = 'EphraiemSarabamoun/humanity-first-research';

export type ScoreAxis = {
  key: 'soundness' | 'presentation' | 'contribution' | 'overall' | 'confidence';
  label: string;
  max: number;
  blurb: string;
};

export const SCORE_AXES: ScoreAxis[] = [
  {
    key: 'soundness',
    label: 'Soundness',
    max: 4,
    blurb: 'Are the claims supported by the evidence? Is the method valid and are the numbers trustworthy?',
  },
  {
    key: 'presentation',
    label: 'Presentation',
    max: 4,
    blurb: 'Is the writeup clear, well organized, and honest about its limitations?',
  },
  {
    key: 'contribution',
    label: 'Contribution',
    max: 4,
    blurb: 'Does the result matter for AI safety? Would another researcher learn something from it?',
  },
  {
    key: 'overall',
    label: 'Overall',
    max: 10,
    blurb: 'Your overall assessment of the paper, on the 10-point scale used by NeurIPS.',
  },
  {
    key: 'confidence',
    label: 'Confidence',
    max: 5,
    blurb: 'How confident you are in your own assessment, from educated guess (1) to certain (5).',
  },
];

/** Prefilled GitHub issue-form URL for reviewing a given paper. */
export function reviewUrl(slug: string): string {
  const params = new URLSearchParams({
    template: 'paper-review.yml',
    title: `Review: ${slug}`,
    paper_slug: slug,
  });
  return `https://github.com/${REPO}/issues/new?${params.toString()}`;
}

/** Mean overall score across a paper's reviews, to one decimal. */
export function meanOverall(reviews: { data: { scores: { overall: number } } }[]): number | null {
  if (reviews.length === 0) return null;
  const sum = reviews.reduce((acc, r) => acc + r.data.scores.overall, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}
