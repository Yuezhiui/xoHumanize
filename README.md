# xoHumanize

**Clear writing. Your voice.**

A standalone writing skill for editing drafts, matching your voice, and preserving what you mean. Use it for emails, articles, reports, documentation, or stories.

The skill contains instructions and focused references. It runs inside a compatible agent harness using that harness's model, login, and tools. There is no application to run or separate API key to configure.

## Install

In Codex, ask the skill installer:

```text
$skill-installer install the skill at https://github.com/Yuezhiui/xoHumanize/tree/main/xohumanize
```

For manual installation, copy the entire `xohumanize/` folder into `~/.agents/skills/` (on Windows, `%USERPROFILE%\.agents\skills\`). Keep its references and metadata together. Follow your host's installation instructions for other compatible harnesses.

## Use

```text
$xohumanize
Edit this:

[paste your draft]
```

Editing defaults to Light and follows the voice of your draft. Specify the audience, tone, length, or format when needed.

| Level | What changes |
| --- | --- |
| Light | Grammar, obvious filler, and awkward wording. Keeps most phrasing and organization. |
| Standard / medium | Sentences and paragraphs, repetition, and flow. |
| Deep / hard | Wording and structure throughout the piece, for its intended audience and purpose. |

All levels preserve substantive meaning, facts, citations, qualifications, and the author's position. Intensity controls the extent of editing, not a detector score.

The skill checks for staged openings, repeated closers, forced grouping, decorative formatting, and leftover chatbot wording. It preserves purposeful rhetoric and useful structure. For replies with shared context, it leads with the answer and keeps the reasoning needed to act.

When asked to edit a file, it changes prose within the requested scope while preserving code, commands, metadata, data, template syntax, and link destinations. Rankings and timing relationships remain part of the protected meaning.

```text
$xohumanize
Use hard editing. Keep the tone formal and preserve the technical details:

[paste your draft]
```

For new writing, provide a topic or notes:

```text
$xohumanize
Draft a short release note from these changes:

[paste your notes]
```

## Voice and review

The skill follows your explicit voice instructions, a supplied profile or relevant writing samples, or the voice of the draft. For new writing without samples, it chooses a tone suited to the audience and purpose. It cannot establish your personal voice from a topic alone.

Ask it to analyze your writing samples and build a reusable voice profile. To reuse that profile across chats, ask the harness to save it to a private file and load that file in the next chat. Keep profiles and drafts outside the distributed skill folder.

Finished prose is the default output. You can also request a diagnosis without rewriting, an edit of one passage, a before/after comparison, or a review of changes in meaning and detail.

Ask to show the editing process for a first revision, a short critique, and the final revision. A supplied voice sample or explicit punctuation preference can override the default avoidance of new em dashes. The skill preserves your opinions and reactions rather than inventing a personal stance.

In Codex, use `$xohumanize` or select it through `/skills`. Command syntax depends on the host. See the [official skills guide](https://learn.chatgpt.com/docs/build-skills).

## Skill files

- [SKILL.md](xohumanize/SKILL.md): tasks, defaults, editing levels, and fidelity requirements.
- [Writing rules](xohumanize/references/writing-rules.md): guidance for natural prose across genres.
- [Voice](xohumanize/references/voice.md): sample analysis and reusable profiles.
- [Review](xohumanize/references/review.md): diagnosis, comparisons, and fidelity checks.
- [Codex metadata](xohumanize/agents/openai.yaml): display name and suggested prompt.

xoHumanize does not guarantee AI-detector results or invent experiences to make writing sound personal. Review important edits against your source.

## License

[MIT](LICENSE). Copyright (c) 2026 Yuezhiui.
