# Voice from evidence

Analyze supplied samples for recurring, observable choices: register, vocabulary, sentence construction, paragraph structure, point of view, contractions, humor, punctuation, and how arguments or examples are introduced. Do not infer identity, education, personality, or biography from prose.

Use more than one relevant sample when available. With a single short sample, produce a tentative profile and identify what cannot be inferred. Separate styles by audience or genre when samples conflict. Avoid rigid sentence-length quotas or copying distinctive phrases into unrelated writing.

For each proposed trait, give a short description, evidence identifying the sample and a brief excerpt or observation, and confidence (`tentative` or `supported`). A tendency supported by several relevant passages has more weight than one isolated construction. User corrections take priority over inferred traits. A profile can evolve when the user supplies new evidence; do not automatically train it on generated rewrites.

## Portable profile

When a structured profile is requested, use this JSON shape:

```json
{
  "version": 1,
  "name": "Work emails",
  "scope": "Short professional emails to colleagues",
  "traits": [
    {
      "trait": "Opens with the request",
      "evidence": "Sample 1 opens with a question; sample 2 starts with the deadline.",
      "confidence": "supported"
    }
  ],
  "preferences": ["Keep technical terms"],
  "avoid": ["Exclamation marks"],
  "limitations": ["No evidence for long-form writing"]
}
```

Ask the user to correct a tentative profile when those corrections would help; do not make approval an automatic blocker for the requested edit. Applying a profile is optional. Keep raw samples and personal context out of the profile unless the user explicitly wants them included. Keep evidence brief and avoid sensitive quotations when an observation is enough.

Save a profile only when the user asks or explicitly chooses a save action. Use their chosen private location; otherwise offer a local profile file and identify its actual path. Never store it inside the distributable skill or claim cross-chat memory without real storage. Load only the profile selected for the task. Do not publish or commit profiles, samples, or personal stories with the skill.

## Personal context

Use experiences and opinions only when supplied for this task or explicitly authorized for reuse. They may improve a piece when relevant, but their presence does not establish human authorship or any detector outcome. Do not infer them from a voice profile. Keep the author's stance intact and flag a conflict between requested context and source facts.
