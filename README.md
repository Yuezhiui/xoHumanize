# xoHumanize

**Clear writing. Your voice.**

A writing skill and web editor that cut filler, match your voice, and keep your meaning intact.

Use it to edit an email, tighten an article, clean up documentation, or draft something new. xoHumanize looks for sentences that sound polished but say little: inflated claims, stock transitions, repeated conclusions, and corporate language. It turns them into prose the reader can follow.

## An example

Before:

> Our dashboard serves as a powerful tool that empowers teams to leverage real-time insights, fostering collaboration and enhancing operational efficiency. It shows open orders and updates every minute.

After:

> The dashboard shows open orders and updates every minute.

The revision keeps the concrete information and removes claims the draft never explains. If the source includes evidence of faster work or better coordination, those details belong in the edit too.

## What it edits

- Vague praise, promotional adjectives, and unnecessary jargon.
- Formulaic openings, rhetorical contrasts, and conclusions that repeat the introduction.
- Repetition, awkward transitions, and sentences padded with shallow commentary.
- Structure and sentence rhythm when they make a passage harder to read.

The rules protect facts, citations, quotations, technical terms, and uncertainty. Formal writing stays formal when the brief calls for it. A precise term stays in place even if it appears on the list of words to review.

You can choose light, standard, or deep editing; build a reusable voice profile from your own writing; and ask for a diagnosis, comparison, or fidelity review. Selected-passage edits keep the surrounding text intact.

Editing a supplied draft now starts with **Light**: keep your effective phrasing and change what needs attention. Choose Standard or Deep when you want a broader rewrite. To work in your own voice, start with your draft and optionally add relevant samples; writing from notes creates a new draft and cannot establish your personal voice by itself.

The same editing principles apply to emails, essays, reports, documentation, and stories: concrete detail, a clear progression of ideas, purposeful sentence rhythm, and precise language. The voice adapts to the audience and genre. A formal report can stay formal, and a story can retain its atmosphere. The rules preserve intentions, qualifications, and exceptions as carefully as names and numbers.

## Harness skill

The `xohumanize/` folder is a standalone Agent Skill. It includes the entry point, writing rules, voice-profile guidance, review guidance, and license. Copy the whole folder so its references travel with it. It runs inside a compatible agent harness using that harness's model and tools; the web app is optional.

In Codex, ask the built-in skill installer:

```text
$skill-installer install the skill at https://github.com/Yuezhiui/xoHumanize/tree/main/xohumanize
```

For a manual installation, download or clone this repository and copy the entire `xohumanize` folder into your personal skills directory at `~/.agents/skills/`. On Windows, that is `%USERPROFILE%\.agents\skills\`. To use it in one project, copy the folder into that project's `.agents/skills/` directory instead.

If the skill does not appear, restart Codex. See the [official skills documentation](https://learn.chatgpt.com/docs/build-skills) for local discovery and installation details.

## Use

```text
$xohumanize
Edit this email. Keep it professional and under 150 words:

[paste your text]
```

You can also ask for a lighter edit, a full rewrite, or a draft:

```text
$xohumanize
Draft a short release note from these changes. Keep the technical terms:

[paste your notes]
```

The skill returns the finished prose by default. Ask for a comparison or an explanation of the edits if you want one. The display name is **xoHumanize**; the skill ID is `xohumanize`.

For a reusable voice:

```text
$xohumanize
Analyze these two samples of my writing. Build a voice profile for work emails.
Show the evidence for each trait and flag anything tentative.

[paste samples]
```

Ask the harness to save the profile to a private file if you want to reuse it. The profile format in [voice.md](xohumanize/references/voice.md) also works with the web editor's import/export controls. Keep personal profiles and drafts outside this public repository.

## Web editor

Requires **Node.js 22.9 or newer**. There are no package dependencies to install.

```sh
git clone https://github.com/Yuezhiui/xoHumanize.git
cd xoHumanize
npm start
```

Open [localhost:4318](http://localhost:4318). The app starts in **prompt mode** when no model is configured: prepare a prompt, paste it into your preferred web chatbot, and bring its complete JSON response back to the editor. The interface then shows the revision, changes, and review. It never substitutes a canned rewrite for an AI response.

### Connect a provider

Copy `.env.example` to `.env` and set:

```dotenv
XO_API_BASE=https://api.openai.com/v1
XO_API_KEY=your-provider-key
XO_MODEL=your-model-id
```

Restart the server. The adapter uses the Chat Completions request format and JSON mode. It supports providers with a compatible endpoint; compatibility with every provider is not assumed. Set `XO_JSON_MODE=false` if your provider does not support `response_format`. Responses still need to satisfy the app's JSON contract.

For a local model server that exposes the same format, set its base URL, for example `http://localhost:11434/v1`, and its installed model ID. Local loopback endpoints can run without a key. Remote endpoints require HTTPS and an API key. Keys stay on the server and are never included in exported prompts.

### In the workspace

- **The brief:** choose the task and edit level, describe the audience and purpose, and optionally include personal context.
- **Your voice:** analyze writing samples, correct the resulting profile, and explicitly save it in the browser or export JSON. Short samples produce tentative profiles.
- **Selected passages:** select text in the source and choose “Edit selected passage.” The application inserts the replacement at those exact offsets.
- **Text, Changes, Review:** read the revision, inspect a textual diff, and review model observations alongside literal checks for changed numbers, URLs, quotations, citations, and qualification words. Long-text diffs fall back to lines or whole passages to bound memory use.
- **History:** the last 20 revisions remain available during the session. Saving history across visits is optional. Turning it off removes the saved browser copies.

Drafts and samples are sent to the configured provider when you run an AI action. In prompt mode, you choose where to paste them. Saved profiles and optional history use this browser's local storage; other people using the same browser profile can access them. The server does not persist drafts or log their contents. There are no accounts or cloud synchronization.

### Static hosting or a server

```sh
npm run build
```

This writes a static **prompt-mode** site to `dist/`, including the current skill instructions. Upload that folder to a static host. It works at a domain root or subdirectory and contains no provider credentials. Rebuild after changing the skill.

For direct AI actions, run the Node server. It binds to localhost by default. Public binding requires an HTTPS reverse proxy, `XO_ORIGIN` set to the public origin, and `XO_ACCESS_TOKEN` with at least 32 characters. Users enter that shared access token under Model connection; it stays in memory for the session. Configure HTTPS and deployment access controls for your host. This is a single-user or trusted-group setup, not an account-based service.

### API

`GET /api/status` reports connection readiness without credentials. `POST /api/run` accepts JSON with `operation` (`edit`, `draft`, `analyze`, or `profile`), `source`, `intensity`, optional `audience`, `purpose`, `context`, `samples`, and a version 1 `profile`. For passage editing, add `selection: {start, end}` using JavaScript UTF-16 offsets into the source. If configured, send the server access token as `Authorization: Bearer …`.

The API validates requests and model responses, limits request size and concurrent model calls, rejects foreign browser origins, and stops provider requests after 90 seconds. Edit responses contain `text`, `replacement`, `analysis`, `review`, `scope`, and literal-check `warnings`. Profile responses contain `profile`. Provider failures are returned as errors, without fabricating results.

## Verification

```sh
npm run check
npm run build
```

Tests cover request and response validation, profile portability, exact passage replacement, diff reconstruction, fidelity warnings, and HTTP/provider behavior using mocks. [Behavioral evaluation cases](evals/README.md) cover meaning preservation and voice matching. The automated tests do not prove live model quality. A model's review of its own writing is an editorial aid, and the literal checks can produce false alarms.

For controlled comparisons, run `npm run eval -- prepare`. It freezes the baseline and candidate skill instructions, identical case inputs, model settings, and repeated A/B prompts in an ignored private folder. You can generate responses through your configured provider or bring back responses from a harness, then use `npm run eval -- report <run-directory>` to review length checks, fidelity warnings, and human assessments. Detector results can be recorded manually with their original meanings; the runner never submits text to detectors. See the [comparison workflow](evals/README.md) before running provider calls. The pinned baseline is a reference, not evidence of detector avoidance.

## The rules

[SKILL.md](xohumanize/SKILL.md) contains the workflow and links to its focused references. [agents/openai.yaml](xohumanize/agents/openai.yaml) contains the display name and suggested invocation prompt. The standalone skill needs no scripts or separate API keys. The web editor assembles its prompts from these same files.

It started with a set of rules for avoiding common AI writing patterns. The rules were revised to allow necessary terminology, preserve useful analysis, and keep edits faithful to the source. It does not invent personal experiences or facts to make a passage sound natural, and it makes no promises about AI-detector scores.

## License

[MIT](LICENSE). Copyright (c) 2026 Yuezhiui.
