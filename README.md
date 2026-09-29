# xoHumanize

**Clear writing. Your voice.**

A Codex writing skill that cuts filler, replaces vague phrasing, and keeps your meaning intact.

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

## Install

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

## The rules

[SKILL.md](xohumanize/SKILL.md) contains the full editing instructions. [agents/openai.yaml](xohumanize/agents/openai.yaml) contains the display name and suggested invocation prompt. The skill consists of instructions, so it needs no scripts or API keys.

It started with a set of rules for avoiding common AI writing patterns. The rules were revised to allow necessary terminology, preserve useful analysis, and keep edits faithful to the source. It does not invent personal experiences or facts to make a passage sound natural, and it makes no promises about AI-detector scores.
