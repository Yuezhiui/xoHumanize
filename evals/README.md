# Behavioral checks

The reference version is pinned in `baseline.json`. It is a comparison point, not a proven winner. Keep this baseline and the general style rules stable while collecting evidence. A new rule or default is a candidate until matched runs show what changed. Record the reason and reviewed results before deliberately updating the baseline.

## Prepare a comparison

```sh
npm run eval -- prepare
```

This creates a private directory under `.private/evaluations/`. By default it compares the pinned revision with the current working files on all nine cases, with three repeats per case and version (54 requests). Preparing uses no model or detector service. Each run contains complete instruction snapshots, their hashes and Git revisions, the shared prompt-builder hash, case inputs, generation settings, and the exact prompts. A working-tree snapshot includes uncommitted skill edits and is identified by its content hash.

For a smaller run or another baseline:

```sh
npm run eval -- prepare --baseline 7367899 --candidate WORKTREE --case final-word-count --repeats 3
```

The versions receive randomly assigned A/B labels, and execution order alternates randomly within each pair. Review the outputs before looking at the identities in `manifest.json`. Inputs, editing intensity, and the response contract remain identical between versions; the case rubric is kept out of the prompts. This isolates the bundled skill instructions, not a historical app implementation or its defaults. Cases may explicitly set `operation` (`edit` or `draft`), `intensity`, `expectedWords`, and `oneParagraph`. Comparisons default to standard intensity unless a case overrides it, regardless of the editor's current default.

## Generate responses

With a provider configured in `.env`, prepare using its model and then execute the saved run:

```sh
npm run eval -- prepare --case final-word-count --repeats 1
npm run eval -- run .private/evaluations/<run-directory>
```

`run` sends the saved prompts to the configured model and incurs its normal usage costs. Calls are sequential, have a 90-second timeout, and use the same requested model and settings for both versions. Optional `--temperature` and `--seed` flags on **prepare** are passed unchanged to the provider; omit unsupported parameters. Omitted settings use provider defaults. Equal settings do not guarantee deterministic outputs. Resolved model names and provider fingerprints, when returned, are recorded alongside each response. If a model alias or fingerprint changes during a run, assess those results separately.

The endpoint, requested model, and JSON-mode setting must match preparation. `--model` can record a model before a key is available, but the environment must match it when running. Credentials are never written to the run folder. A run lock prevents concurrent execution; failures are saved and reported, with credentials redacted. Running again skips existing responses and retries missing ones. It never silently replaces an output. After an interrupted process, remove `.running` only after confirming no evaluation process still owns that run.

Without an API provider, use each numbered folder's `prompt.txt` in a fresh chat using the same selected model. Paste the complete JSON response into that folder's `response.txt`. Record the actual model and any available settings in your private notes. These results are marked manual with unverified model/settings provenance. Avoid earlier conversation context, extra instructions, or edits to the exported prompts; repeatable API runs provide stronger control.

## Review and report

```sh
npm run eval -- report .private/evaluations/<run-directory>
```

The report lists missing, failed, invalid, and completed responses separately. Completed means valid output was received, not that its writing passed review. It counts final words and paragraphs, checks explicit length targets, and reports literal fidelity warnings. Validated prose is extracted into `text.txt` beside the raw response. Editing a response after an API run marks its generation provenance unverified. Altering frozen cases, requests, or instruction snapshots requires a new run.

Review each result against the private `cases.json` rubric and source. Fill in `review.json` with your reviewer name and evidence for `fidelity`, `readability`, and `voice`, using `pass`, `concern`, or `not_reviewed`. The model's self-assessment in `response.txt` never counts as an independent review. Rerun the report to include your notes.

If you already checked a result with a detector, add observations to the review's `detectors` array:

```json
{"tool":"Detector name","score":15.3,"meaning":"Exact label or meaning shown by this tool","date":"2026-09-29","notes":"Optional version, settings, or context"}
```

Scores retain their tool, meaning, and date; they are never averaged into a common percentage or used to declare a winner. The runner has no detector integration. Keep raw drafts, outputs, profiles, and observations in the ignored private directory.

Compare repeated results across cases for meaning changes, unnecessary rewriting, voice, and readability. Reject a candidate that loses protected information even if a detector score drops. Include failures and unreviewed cases in the assessment, and describe a benefit as provisional when the sample is small. Preserve held-out cases when developing new rules. The report does not automatically promote candidates or modify skill instructions.

## Existing cases

`cases.json` contains synthetic editing tasks for evaluating the skill with a real model or harness. Give the model the task and source with the skill loaded. Keep each case's `checks` out of its prompt, then assess the result against them. Record the model, skill revision, date, outputs, and observed failures in a private evaluation folder.

For voice matching, use additional user-approved samples and a separate held-out writing sample. Judge observable style and source fidelity. Do not use an AI-detector score as a success criterion.

When checking a reported regression, use the same input, model, generation settings, length constraint, and output format for both skill revisions. Keep the outputs before assessing them; repeat matched runs if drawing a general conclusion. Score final length, unsupported additions, voice preservation, and specific editorial problems separately. A different task, model, or word budget cannot isolate the effect of a skill change. Record user-supplied detector results as observations, without claiming a cause or sending text to a detector without permission.

The automated tests verify input/output validation, exact passage replacement, diff reconstruction, literal warnings, and HTTP/provider behavior with mocked responses. They do not establish that a real model consistently preserves meaning or matches a voice. These behavioral cases have not been scored against a live model as part of the automated suite.
