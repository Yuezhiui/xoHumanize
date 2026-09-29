# Diagnosis, comparison, and fidelity

Keep these outputs optional. A diagnosis request alone does not authorize rewriting. For a diagnosis followed by editing, keep observations concise and tied to actual passages.

## Diagnosis

Identify specific issues and their effect on the reader: vague wording, repetition, unsupported claims, inconsistent tone, confusing order, or weak transitions. Quote only enough to identify the passage. Do not infer authorship or label prose "AI-written" from stylistic markers.

## Comparison

When requested, show before/after excerpts or an actual textual diff. Describe consequential changes and omissions. Distinguish removed repetition from removed substance. Do not claim a word-level diff if you are merely summarizing edits. For long texts, prioritize substantive changes or offer an artifact rather than reproducing everything in chat.

## Fidelity report

Use a list or structured object with `category`, `status`, and `note`. Status is `checked`, `concern`, `not_checked`, or `not_applicable`. Each checked result needs a concrete observation. Categories should cover:

- Meaning and stance, including negation and causal relationships.
- Names, quantities, units, and dates.
- Qualifications, uncertainty, and obligations.
- Quotations and citation attachment.
- Personal details and other added information.
- Omissions and changes in scope.
- External accuracy, marked `not_checked` unless independently verified.

"Checked" means compared with the supplied source; it does not mean proven correct. A model reviewing its own rewrite is not an independent auditor. Never replace evidence with a fidelity percentage or mark a category checked when the source is unavailable. For drafts, compare factual claims with the notes and identify additions; ordinary newly written connective prose is not automatically a factual invention.

Correct recoverable fidelity issues before presenting the final rewrite. If uncertainty remains, describe the specific concern separately so the user can decide what to keep.
