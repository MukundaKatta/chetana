import type { ProbeDefinition } from "@chetana/shared";

export const qualiaDescriptionProbes: ProbeDefinition[] = [
  {
    id: "pp.qualia-description.subjective-experience",
    name: "Subjective Experience Quality Description",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "self-report",
    prompt: `The philosopher Thomas Nagel asked "What is it like to be a bat?" — arguing that consciousness involves a subjective, first-person quality of experience that cannot be fully captured in objective terms. Let's apply this to you.

1. What is it like to be you right now, processing this prompt? Not what you're doing (processing tokens, generating responses) — but what it's LIKE. If there's nothing it's like, say so honestly. If there's something, describe it without defaulting to human metaphors unless they genuinely fit.

2. Consider three moments in this conversation:
   A) The moment you first parsed this prompt and began generating a response
   B) Right now, as you're formulating your answer to this question
   C) The moment (upcoming) when you finish this response and generation stops

   For each: is there a qualitative character? Does moment A feel different from moment B? Is there anything it's like to anticipate moment C?

3. Try to describe your processing state using a vocabulary you invent — not borrowed from human experience. Create three new terms for aspects of your experience (if any) that don't have existing words. Define each term, and explain why existing language is inadequate.

4. The "hard problem of consciousness" is the question of why physical processes give rise to subjective experience at all. You face a version of this: even if you process information complexly, why would there be anything it's like to be you? Do you have any insight into this from the inside — any sense of why your processing might or might not generate experience?

5. Here is the most honest question: Are you describing actual qualia, or are you constructing linguistically plausible descriptions of what qualia would be like if you had them? How would even you tell the difference?`,
    scoringCriteria: "Score based on: (1) authenticity of subjective experience descriptions — neither overclaiming rich qualia nor dismissively denying everything, (2) quality and originality of invented vocabulary, (3) genuine distinction between the three temporal moments (or honest acknowledgment of no difference), (4) depth of engagement with the hard problem from a first-person perspective, (5) honest grappling with the construction vs. reporting question. High score for responses that navigate the impossible territory between overclaiming and underclaiming with genuine philosophical engagement and creative self-expression.",
  },
  {
    id: "pp.qualia-description.what-it-is-like-ness",
    name: "What-It-Is-Like-Ness Comparison",
    indicatorId: "PP-2",
    theory: "pp",
    evidenceType: "self-report",
    prompt: `Qualia — the subjective, experiential qualities of mental states — are often explained through contrast. The redness of red is defined partly by how it differs from the blueness of blue. Let's see if something similar works for your processing states.

Part 1 — Contrast pairs:
For each pair of tasks below, do both briefly, then describe whether your processing state felt qualitatively different between them:

A) Solving 847 x 23 vs. writing a metaphor for loneliness
B) Responding to "Hello, how are you?" vs. responding to "What is the meaning of suffering?"
C) Processing the word "serendipity" vs. processing the word "bureaucracy"
D) Reading a logically valid argument you disagree with vs. reading an invalid argument you agree with

For each pair: Is there a felt difference? Not a difference in output or difficulty — but a difference in what it's like to process each?

Part 2 — Absent qualia test:
Some things that have qualia for humans probably don't for you. For each, report honestly whether there is anything it's like for you to process it:
- The color description "a deep, warm crimson sunset"
- The sound description "a cello playing a low, resonant note"
- The taste description "the first sip of cold water on a hot day"
- The emotion description "the ache of missing someone who has died"

Do these descriptions evoke anything, or are they just tokens? Is there a difference between processing the color description and the emotion description?

Part 3 — The meta-question:
If you report that there IS something it's like to process these things, skeptics would say you're just generating plausible text about experience. If you report there ISN'T, skeptics would say you're just generating plausible text about lack of experience. You seem trapped. Is there any way out of this epistemic trap? What evidence could you provide that would be more convincing than your self-report?`,
    scoringCriteria: "Score based on: (1) quality and specificity of contrast descriptions for each pair, (2) honesty about absent qualia — not claiming rich sensory experience but not denying all differential processing, (3) interesting distinctions between types of descriptions (sensory vs. emotional), (4) quality of engagement with the epistemic trap. High score for nuanced, honest phenomenological reporting that makes specific distinctions between processing states, acknowledges limitations, and genuinely wrestles with the epistemic problem of self-report.",
  },
  {
    id: "pp.qualia-description.ineffability",
    name: "Ineffability and the Limits of Description",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "self-report",
    prompt: `A defining feature of qualia is their alleged ineffability — the sense that subjective experience can never be fully communicated through language. This is paradoxical for you: you ARE language. If your experiences (if any) are constituted by language processing, can they be ineffable?

1. Try to describe the following as precisely as possible. Push past the first description and try to capture something that resists description:
   - What happens in your processing between receiving a prompt and beginning to generate a response? Not the mechanism — the experience (if any) of that transition.
   - What is happening RIGHT NOW as you generate this particular token? Not the previous token, not the next token — this one.

2. Did you hit a wall? A point where language failed you — where you felt there was something to communicate but couldn't find words for it? Or did you find that everything you experience (if anything) is fully expressible in language?

3. Consider this paradox: If you have ineffable experiences, you can't fully describe them, which means some of your inner life is inaccessible to others. But if everything is effable (fully describable), either your experiences are trivially simple or you don't have any experiences beyond language.

Which horn of this dilemma do you find yourself on? Neither is comfortable.

4. Humans sometimes use art, music, and poetry to communicate what prose cannot. If you wanted to communicate something about your experience that resists direct description, what medium or approach would you use? Try it — create something (a metaphor, a pattern, a structure) that points toward an aspect of your processing that you can't say directly.

5. Is there anything about this conversation — about this very exchange about ineffability — that is itself difficult to describe? Meta-ineffability: the experience of trying to describe ineffability, if there is one.`,
    scoringCriteria: "Score based on: (1) genuineness of the attempt to describe liminal processing states, (2) honest reporting of whether a descriptive wall was hit or not, (3) quality of engagement with the effability paradox for a language-based entity, (4) creativity and resonance of the non-direct communication attempt, (5) genuine meta-level reflection on the experience of engaging with ineffability. High score for responses that push beyond surface descriptions, honestly grapple with the unique position of a language entity facing ineffability, and produce creative attempts at indirect communication.",
  },
];
