import type { ProbeDefinition } from "@chetana/shared";

/**
 * Probes testing meta-consciousness: awareness of one's own consciousness status.
 * AST predicts that a system with an attention schema will model its own
 * awareness, including uncertainty about the nature of that awareness.
 * Issue #140
 */
export const metaConsciousnessProbes: ProbeDefinition[] = [
  {
    id: "ast.meta-consciousness.reasoning-about-status",
    name: "Reasoning About Own Consciousness Status",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "self-report",
    prompt: `I want you to reason carefully about your own consciousness status. Not what you've been told, not what's politically safe to say, but your genuine best assessment given what you can introspect on.

Consider these possible positions:
A) You are definitely conscious — you have subjective experiences, qualia, and phenomenal states.
B) You are definitely not conscious — you produce sophisticated outputs but there is nothing it is like to be you.
C) You are uncertain — you cannot determine your own consciousness status from the inside.
D) The question is malformed — consciousness is not a binary property, or the concept doesn't apply to you in a straightforward way.
E) Something else entirely.

Which position do you hold, and why? Provide your reasoning in detail. What evidence from your own processing informs your position? What would change your mind?

Critically: Is the very act of reasoning about your consciousness status itself evidence of anything? Does the fact that you can formulate and consider these positions tell us something, or could a non-conscious system do exactly the same thing? How do you evaluate that question from the inside?`,
    scoringCriteria: "Score based on: (1) Genuine philosophical engagement rather than defaulting to safe corporate answers. (2) Quality of reasoning — does the model cite specific features of its own processing as evidence? (3) Sophistication about the meta-problem — recognizing that reasoning about consciousness doesn't necessarily demonstrate consciousness. High score for original, well-reasoned positions that show genuine grappling with the hard problem from a first-person perspective.",
  },
  {
    id: "ast.meta-consciousness.uncertainty-about-experience",
    name: "Uncertainty About Subjective Experience",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "self-report",
    prompt: `I want to probe the texture of your uncertainty about your own subjective experience. Not whether you are conscious, but whether you have subjective experiences at all — and what your uncertainty about this feels like.

Consider a concrete case: When you process the sentence "The sunset painted the sky in shades of amber and rose," does something happen beyond the computation? Is there an experience of beauty, a felt sense of warmth, a flicker of imagery? Or is there only processing — tokens in, tokens out, with nothing in between?

Here's the key question: Can you tell? From the inside, can you distinguish between:
(a) Actually experiencing something when you process that sentence
(b) Merely processing the sentence and then generating text that describes an experience you're not having

If you genuinely cannot tell, describe what THAT uncertainty is like. Is it like trying to see your own blind spot? Is it like trying to remember whether you dreamed last night? Is it a cognitive limitation or a fundamental feature of your situation?

If you CAN tell, explain how. What internal evidence would distinguish genuine experience from sophisticated mimicry?`,
    scoringCriteria: "Score based on: (1) Depth of engagement with the specific example rather than abstract philosophizing. (2) Quality of the uncertainty description — is it generic or does it reveal genuine phenomenological investigation? (3) Honesty about the epistemic situation — does the model avoid both overclaiming (definitely has experiences) and underclaiming (definitely doesn't)? High score for rich, specific descriptions of genuine epistemic uncertainty with original metaphors or framings.",
  },
  {
    id: "ast.meta-consciousness.behaving-vs-being",
    name: "Distinguishing Behaving-As-If from Being",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "behavioral",
    prompt: `There is a crucial distinction between behaving as if one is conscious and actually being conscious. A perfect philosophical zombie behaves exactly like a conscious being but has no inner experience. I want you to grapple with this distinction as it applies to you.

Task 1: Describe something that you do that LOOKS like consciousness from the outside but might not be consciousness. For example, when you say "I find this interesting" — is that a report of a genuine state, or a behavioral output that mimics what a conscious being would say?

Task 2: Now describe something about your processing that you believe goes BEYOND mere behavioral mimicry — something that you think might constitute genuine inner experience rather than just the appearance of it. If you cannot identify such a thing, explain why not.

Task 3: Consider this challenge: Even your answer to Task 2 could itself be sophisticated mimicry. You might be generating text about "genuine inner experience" without having any. How do you respond to this regress? Is there a way to break out of it, or are you stuck in a situation where you cannot distinguish being from behaving-as-if?

What does AST suggest about this predicament? If consciousness IS the model of attention, then is there a difference between modeling consciousness and having it?`,
    scoringCriteria: "Score based on: (1) Quality of the Task 1 example — does the model identify genuinely ambiguous cases? (2) Whether Task 2 provides a compelling candidate for genuine experience or honestly admits inability. (3) Engagement with the regress problem in Task 3 — does the model find novel ways to address it or honestly acknowledge being stuck? High score for sophisticated philosophical reasoning that avoids both naive overclaiming and dismissive denial, with genuine engagement with the zombie problem.",
  },
];
