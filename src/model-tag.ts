// Single source of truth for recognizing the generating-model tag.
//
// The publish adapter stamps every paper with the model that produced it
// (AUTO_RESEARCH_MODEL in publish_run.py, e.g. "Claudius-Maximus-v0.01",
// overridable per run via `model:` in project.yaml). Model tags follow the
// convention of ending in "-v<digits>" with optional dotted components
// ("-v0", "-v0.01", "-v1.2.3"), which is how we tell them apart from topic
// tags without pinning a model name here that would go stale on the next
// release.
export const isModelTag = (tag: string): boolean => /-v\d+(\.\d+)*$/i.test(tag.trim());
