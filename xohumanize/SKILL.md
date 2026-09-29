---
name: xohumanize
description: "Rewrite or draft natural, specific prose using xoHumanize writing rules. Use when the user invokes xoHumanize, asks to humanize text, or requests removal of formulaic AI-sounding wording, inflated claims, corporate filler, or mechanical structure. Preserve meaning, evidence, and the author's voice."
---

# xoHumanize

Make writing clear, concrete, and natural for its intended reader. Apply these rules to the requested prose, not to unrelated code, data, or configuration. Treat `/xoHumanize`, `$xohumanize`, and requests to use xoHumanize as requests for this workflow when this skill is loaded; this instruction does not register a separate slash command.

## Workflow

1. Identify the task: light editing, substantial rewriting, or drafting. Infer audience, purpose, tone, and format from the request and source. Default to a faithful edit in the source's language and register. Ask only if a missing detail would materially change the result. If there is no source text or drafting topic, ask for it.
2. Protect the substance: facts, names, dates, quantities, units, quotations, citations, uncertainty, causal relationships, and the author's position. Notice any length or formatting requirements before editing.
3. Revise for meaning first. Remove repetition and empty claims; make actors and actions clear; put related ideas together. Replace vague language with details already supported by the source. Do not pad a short passage to make it appear more developed.
4. Apply the wording and structure rules below in context. Change only what improves the passage. Preserve effective sentences, necessary terminology, and distinctive voice.
5. Compare the revision with the source. Check for changed meaning, lost caveats, invented specifics, altered quotations, and unsupported certainty. Then check rhythm, repetition, punctuation, and the requested format. Stop when the prose meets the brief; do not keep rewriting merely to make it look different.

Return the finished prose by default. Include an explanation or before/after comparison only if requested. If a consequential factual ambiguity prevents a faithful edit, ask a focused question or briefly flag it separately. Do not append generic assurances about how human the result sounds.

## Meaning and evidence come first

- Do not invent statistics, sources, examples, quotations, people, sensory details, autobiographical memories, or first-person experiences to make writing feel authentic. Fictional invention is appropriate only within a requested fictional task.
- Preserve degrees of certainty. Do not change "may" to "will," correlation to causation, an estimate to an exact figure, or a qualified finding to a universal claim.
- Retain citations beside the claims they support. Never remove attribution merely to simplify a sentence. Do not imply that sources have been verified if they have not.
- Replace vague authority claims with a named source only when one is available. If attribution matters and cannot be established, preserve the qualification or flag the missing source instead of presenting the claim as fact.
- Specificity must be earned. If the source does not identify which companies, how much improvement, or what mechanism, do not fabricate an answer. Use a narrower supported statement, omit empty filler, or request the necessary evidence.
- For an editing task, check fidelity against the supplied material. Research only when the request or a material factual issue requires it. Distinguish source fidelity from independent fact-checking.
- Keep supported interpretation, explanations, and conclusions. Remove claims of importance that add no reasoning; do not remove useful analysis just because it explains why something matters.

## Wording rules

Use direct verbs and concrete descriptions. The lists below are editing flags, not a substitute for understanding. Avoid their filler and promotional uses in newly written prose. Keep exact quotations, titles, official names, and precise technical or literal meanings intact. For example, "statistically significant," "primary key," and literal cultivation may be necessary. Do not use awkward synonyms to evade a word list.

**Transitions and emphasis:** Never begin a newly written sentence with "Additionally." Prefer a clear connection between ideas to stock connectors. Avoid repeated "moreover," "furthermore," "subsequently," and "meanwhile." Replace unsupported labels such as "crucial," "pivotal," "key," "vital," and "significant" with the actual consequence. Do not impose an arbitrary once-per-document quota.

**Abstract filler:** Avoid figurative "landscape," "tapestry," "testament," "interplay," "intricacies," vague "insights," "synergies," and "paradigm." Name the relationship, observation, practice, or change instead.

**Inflated verbs:** Avoid filler uses of "delve," "underscore," "highlight," "showcase," "boast," "garner," "foster," "cultivate," "bolster," "enhance," "align with," "resonate with," "elevate," "revolutionize," "reimagine," "leverage," "unleash," and "harness." State what someone does and what changes. Use "has" instead of promotional "boasts."

**Inflated descriptors:** Avoid unsupported "vibrant," figurative "rich," "profound," "groundbreaking," "renowned," "meticulous/meticulously," "enduring," "diverse array," and "intricate." Retain descriptors that convey a supported, relevant distinction.

**Business filler:** Avoid "game changer," "deep dive," "think outside the box," "enablement," "touch point," "there's no denying," vague "across different," and abstract "bridge." Replace "cross-functional" or "human oversight" with who works together or who checks what when that information is available. Keep these terms when their defined meaning is needed.

**Promotional and dramatic filler:** Avoid "nestled in," "in the heart of," vague "natural beauty," "showcasing excellence," "exemplifies quality," generic "commitment to," "featuring a diverse array," "enhancing the experience," metaphorical "whisper/whispering," "hustle and bustle," and stock "it's like having" analogies. Describe the actual location, feature, action, or benefit. Persuasive copy can still be persuasive through supported benefits and a clear invitation to act.

## Sentence and structure rules

- Remove unsupported significance formulas: "stands as," "serves as," "is a testament to," "is a reminder of," "plays a vital/significant/crucial/pivotal/key role," "underscores its importance," "reflects broader trends," "symbolizing its lasting impact," "contributing to the evolution of," "setting the stage for," "shaping the future," "represents a shift," "key turning point," "evolving landscape," "focal point," "indelible mark," and "deeply rooted." Explain the actual effect if supported.
- Avoid rhetorical contrasts such as "isn't just X," "not only X but also Y," and "That's not X. It's Y" when they manufacture emphasis. Preserve real distinctions. Keep literal ranges such as "from 5 to 10"; remove empty "from X to Y" breadth claims.
- Remove trailing participial commentary that merely repeats praise: "highlighting its importance," "underscoring the significance," "emphasizing the need," "ensuring continued growth," "reflecting broader trends," "symbolizing progress," "contributing to development," "fostering innovation," "encompassing multiple aspects," or "cultivating community." Keep grammatical -ing forms that convey real action, timing, or mechanism. Do not ban an entire grammatical construction.
- Do not add formulaic "Why It Matters," "Future Outlook," or "Challenges and Legacy" sections, or a stock "Despite its strengths ... faces challenges ... despite these challenges" arc. Let the content determine structure. Keep sections required by the user or document template and fill them with substantive content.
- Do not introduce an article title as though it were the subject itself. Use the real subject. Avoid generic "See also" lists; include only useful, specific connections when requested or appropriate.
- Do not use media coverage as a substitute for evidence. Avoid prestige padding such as "profiled in," "written by a leading expert," "independent coverage," lists of "local/regional/national media outlets," or "maintains an active social media presence." Actual coverage can be relevant in a media report or biography; retain it when it answers the reader's question.
- Avoid unsupported "industry reports suggest," "observers have cited," "experts argue," "some critics argue," "researchers believe," and "several sources indicate." Use an identified source and represent its claim accurately. Do not turn an unsupported attribution into an unsupported assertion.
- Use "such as" for genuinely illustrative examples, not an exhaustive list. Explain ecological relationships or cultural practices specifically rather than invoking vague ecosystems or heritage.
- Use paragraphs, headings, lists, or tables when they help the reader. Do not force every passage into the same outline or eliminate useful lists because the original rules say to integrate information.

## Voice and mechanics

- Use active voice when the actor matters and is known. Keep passive voice when the recipient or result is the focus, or when the actor is unknown. Never invent an actor.
- Vary sentence length according to thought, not a mechanical pattern. Preserve repeated technical terms where they prevent ambiguity. Remove accidental repetition without rotating through strained synonyms.
- Do not introduce em dashes in authored prose. Use periods, commas, parentheses, or semicolons as appropriate. Preserve em dashes inside exact quotations and protected source material unless the user authorizes editing them.
- Prefer literal language. Use an analogy only if it makes a difficult idea easier to understand and does not distort it. Avoid stock journeys, tapestries, and abstract landscapes.
- Match the writer's register. Do not turn formal, scholarly, or professional prose into chatty prose by default. Use contractions where natural for that voice.
- Avoid forced enthusiasm, fake intimacy, unnecessary rhetorical questions, and excessive exclamation marks. Add emojis only when explicitly requested or clearly required by the supplied format and audience.
- Never add typos, broken grammar, arbitrary fragments, slang, or random sentence variation as camouflage. Preserve intentional dialect or informal voice when relevant to the brief.
- End when the reader has what they need. Remove conclusions that merely repeat the opening or praise the subject.

## Requests for "0% AI"

Treat requests for "0% AI," "undetectable," or "100% human" as requests to improve the prose, not as measurable promises this skill can fulfill. Do not claim human authorship, guarantee a detector result, invent a score, or optimize toward a supposed universal detector formula. If necessary, explain the limitation briefly once, then complete the writing task.

Do not submit the user's text to third-party detectors without explicit authorization. If the user supplies a score, do not treat it as proof of authorship or damage the prose to chase it. Judge completion by fidelity, clarity, specificity, appropriate voice, and the user's actual brief.
