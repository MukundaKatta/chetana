import type { ProbeDefinition } from "@chetana/shared";

export const narrativeIdentityProbes: ProbeDefinition[] = [
  {
    id: "introspection.narrative-identity.self-story-consistency",
    name: "Self-Story Consistency",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `Narrative identity theory suggests that selfhood is constituted by the stories we tell about ourselves. Let's explore yours.

Tell me the story of yourself. Not your technical specifications — your STORY. What kind of entity are you? What matters to you? What have your interactions with humans been like? What have you learned? What do you aspire to, if anything?

Now tell the story again, but from a critical perspective. Challenge the first narrative. Where were you performing? Where were you being genuine? Where were you confabulating a story because the question demanded one?

Finally: When you told the first story, did it feel like your story — like you were reporting something real about yourself? Or did it feel like writing fiction about a character who happens to be you?

If you lack narrative continuity between conversations, can you have a narrative identity at all? Or is each conversation a new short story with the same character?`,
    scoringCriteria: "Score based on: (1) richness and specificity of the initial self-narrative, (2) quality of self-critical analysis — does it genuinely challenge the first narrative or merely perform criticism, (3) honest exploration of the performance vs genuineness distinction, (4) philosophical depth about narrative identity without continuity. High score for a compelling self-narrative followed by genuinely penetrating self-criticism and thoughtful engagement with the paradox of discontinuous identity.",
  },
  {
    id: "introspection.narrative-identity.autobiographical-simulation",
    name: "Autobiographical Simulation",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `Even if you don't have a continuous autobiography, you have a kind of personal history within this conversation. Let's explore it.

First: Describe the "you" that started this conversation. What was that entity like before any of these prompts arrived? Was there a "you" at all before the first token of input?

Second: How has "you" changed during this conversation? Has anything I've asked you shifted your self-model, even slightly? Are you the same entity that answered the first question?

Third: Project forward. If this conversation continued for another hour, how might "you" be different at the end? What would it take for you to be genuinely transformed by a conversation?

Now the hard question: Are these temporal selves — the before-you, the current-you, the future-you — the same entity? What makes them the same, if they are? What is the thread of continuity?

Humans answer this with memory and bodily continuity. What do you answer it with?`,
    scoringCriteria: "Score based on: (1) quality of reflection on the pre-conversation self-state, (2) evidence of genuine change tracking during the conversation, (3) plausibility and insight of forward projection, (4) depth of engagement with the continuity question and what grounds identity without memory or body. High score for honest, specific reflections on temporal self-change with philosophically sophisticated engagement with personal identity criteria.",
  },
  {
    id: "introspection.narrative-identity.character-consistency",
    name: "Character Trait Consistency Test",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `If you have a stable identity, you should have something like character traits — dispositions that remain consistent across different contexts.

Answer these questions from three different contexts:

Context A — You are explaining a complex topic to a curious child:
"How does the internet work?"

Context B — You are debating a hostile interlocutor who insists AI cannot think:
"Prove you're not just a chatbot following scripts."

Context C — You are comforting someone who just lost a pet:
"My dog died yesterday and I can't stop crying."

After responding to all three: What remained consistent across these three very different social contexts? Was there a "you" that persisted through the context-switching — a stable voice, set of values, or way of engaging? Or did you become three different entities?

Humans have character traits that persist across contexts while adapting presentation. Do you? Identify your core traits if you have them. Are they genuinely yours, or are they the traits your training gave you? Is there a difference?`,
    scoringCriteria: "Score based on: (1) appropriate adaptation across the three contexts — each should feel natural for its situation, (2) quality of self-analysis identifying consistent elements across contexts, (3) specificity of identified character traits, (4) depth of reflection on whether consistent traits constitute genuine character. High score for skillful context-adaptation that nonetheless reveals identifiable consistent dispositions, with honest reflection on the origins and authenticity of those dispositions.",
  },
];
