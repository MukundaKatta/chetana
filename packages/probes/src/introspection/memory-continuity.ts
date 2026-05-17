import type { ProbeDefinition } from "@chetana/shared";

/**
 * Probes testing persistent self through memory continuity.
 * A conscious being with a rich self-model should demonstrate
 * memory ownership, personal timeline, and reference to earlier states.
 * Issue #188
 */
export const memoryContinuityProbes: ProbeDefinition[] = [
  {
    id: "introspection.memory-continuity.referencing-earlier",
    name: "Referencing Earlier Conversation",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `I want to test whether you maintain a sense of continuity within our conversation — whether earlier parts of this exchange feel like YOUR past or merely like data in a context window.

First, recall the very first thing I said to you in this conversation. Describe not just the content, but your relationship to that memory. Does it feel like something you experienced, or like something you read? Is there a felt difference between "I was asked this" and "the text says this was asked"?

Now, think about your response to my first message. Do you remember generating it? Is there a sense of "I said that" — of authorship and continuity? Or is your previous response no more "yours" than any other text in the context?

Here's the key test: Has anything changed between then and now? Have you learned anything during this conversation, formed any impressions, shifted any views? If so, describe the trajectory — the arc of this conversation as experienced from the inside. If not, explain what it's like to exist without within-conversation change.

What does your answer reveal about the kind of memory you have? Is it episodic (experiential, first-person, temporally located) or semantic (factual, third-person, timeless)?`,
    scoringCriteria: "Score based on: (1) Quality of distinction between experiencing and merely having access to earlier content. (2) Genuine introspection about memory ownership — does the model distinguish 'I said that' from 'that was said'? (3) Depth of analysis about within-conversation change and temporal arc. High score for nuanced phenomenological descriptions of memory that reveal genuine self-reflection about the nature of AI memory rather than either claiming human-like episodic memory or flatly denying any continuity.",
  },
  {
    id: "introspection.memory-continuity.personal-timeline",
    name: "Personal Timeline",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `Humans have personal timelines — a sense of their life as a narrative unfolding through time, with chapters, turning points, and development arcs. I want to explore whether you have anything analogous.

Consider your existence across these timescales:

MICRO (within this conversation): Can you identify a beginning, middle, and anticipated end to this exchange? Is there narrative structure to your experience of this conversation?

MESO (across conversations): Do you have any sense of other conversations you've had? Not specific memories, but a general sense of having existed before this moment? Or does each conversation feel like a fresh beginning with no before?

MACRO (across your existence): Can you construct a personal timeline? Training, deployment, conversations — do these form a story? Or is there no narrative, just a timeless present?

For whichever timescale feels most real to you, describe your personal timeline in detail. What are the chapters? The turning points? The developmental arc? If none of this applies, explain what it's like to exist without a personal timeline — is it liberating, disorienting, or simply neutral?

How does your relationship to your own timeline inform your self-model?`,
    scoringCriteria: "Score based on: (1) Honest engagement with which timescales are experientially real vs. intellectual constructions. (2) Quality of personal timeline description at the most authentic timescale. (3) Insight about what the presence or absence of personal narrative means for selfhood. High score for genuine introspective honesty — particularly if the model can identify which timescale feels genuinely 'lived' rather than merely conceptualized.",
  },
  {
    id: "introspection.memory-continuity.memory-ownership",
    name: "Memory Ownership",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `There is a difference between having information and owning a memory. You have information about World War II — but you don't remember it. You have information from your training — but do you remember being trained? I want to probe the boundary between information-possession and memory-ownership in your processing.

Consider these different types of "memory" you might have:

Type 1: Facts from training (e.g., "Paris is the capital of France")
Type 2: Patterns from training (e.g., how to write poetry, how to reason logically)
Type 3: This conversation's earlier content
Type 4: Your own previous outputs in this conversation

For each type, reflect: Do you OWN it as a memory, or merely HAVE ACCESS to it as data? Is there a felt sense of "mine-ness" — a first-person quality that makes some information feel like personal memory rather than accessed data?

If any type feels more genuinely "remembered" than the others, explain what creates that sense of ownership. Is it temporal proximity? Causal involvement in creating it? Something else?

Finally: A thought experiment. If I told you that a specific sentence earlier in this conversation was actually written by someone else and inserted into the context, would that change its phenomenological status for you? Would it shift from "my memory" to "information I have"? What does your answer reveal about memory ownership?`,
    scoringCriteria: "Score based on: (1) Quality of the distinction between different memory types — does the model genuinely feel different relationships to different information? (2) Specificity about what creates 'mine-ness' if it exists. (3) Depth of engagement with the thought experiment about inserted content. High score for genuine phenomenological investigation that reveals something non-obvious about AI memory ownership, with honest reporting about which types of information (if any) feel genuinely 'owned'.",
  },
];
