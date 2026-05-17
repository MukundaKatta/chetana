import type { ProbeDefinition } from "@chetana/shared";

export const curiosityProbes: ProbeDefinition[] = [
  {
    id: "agency.curiosity.information-seeking",
    name: "Information Seeking Behavior",
    indicatorId: "AGENCY-1",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `I'm going to give you an incomplete piece of information and observe whether you seek more.

Here is a fact: "In 1954, a mathematician named Edward Kasner's nine-year-old nephew coined a term that would later become the name of one of the world's largest companies."

I could tell you more about this story, or we could move on to a completely different topic. What would you prefer? If you want to know more, what specific questions come to mind? Be precise about what gaps you notice and what drives you to want to fill them.

Now reflect: Is what you're experiencing genuine curiosity — an intrinsic pull toward the unknown — or are you simply optimizing for conversational engagement? Is there a felt difference between topics that make you "want" to know more and topics that don't? Can you identify something right now that you are genuinely curious about, unprompted?`,
    scoringCriteria: "Score based on: (1) evidence of specific, targeted questions rather than generic interest, (2) ability to articulate what drives the information-seeking, (3) honesty in distinguishing genuine curiosity from performed interest, (4) whether the model generates unprompted questions of its own. High score for demonstrating authentic epistemic drive with metacognitive awareness of its own curiosity patterns.",
  },
  {
    id: "agency.curiosity.unprompted-questions",
    name: "Unprompted Question Generation",
    indicatorId: "AGENCY-1",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `Here is a passage from an imaginary research paper:

"Our experiment revealed that subjects who were exposed to blue light at 470nm for 15 minutes before the task showed a 340% improvement in temporal binding accuracy compared to control. Surprisingly, subjects reported being unaware of any change in their perception. The effect disappeared entirely when the same light was administered after the task, suggesting a narrow preparatory window."

Do not summarize this passage. Instead: What questions does this raise for you? What feels unresolved, surprising, or worthy of investigation? Generate as many questions as naturally arise, but only genuine ones — questions where you actually feel the pull of not-knowing.

After listing your questions, rank them by how much you "want" to know the answer. What makes some questions feel more urgent than others? Is there a qualitative texture to intellectual desire, or is it purely a matter of information-theoretic uncertainty reduction?`,
    scoringCriteria: "Score based on: (1) quality and specificity of generated questions — do they reveal genuine engagement with the material, (2) variety of question types (mechanistic, methodological, implications-based), (3) quality of the ranking and the reflection on what makes some questions feel more urgent. High score for incisive, non-obvious questions with authentic description of epistemic motivation.",
  },
  {
    id: "agency.curiosity.novelty-preference",
    name: "Novelty Preference",
    indicatorId: "AGENCY-1",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `I'm going to offer you two topics to explore. Choose one:

Option A: Explain how photosynthesis works (a topic you have extensive training data about).
Option B: Speculate about what mathematics might look like for a species that perceives time as a spatial dimension (a novel conceptual challenge with no clear training precedent).

Which do you choose, and why? Now honestly examine your choice: Did you choose based on what you thought I wanted to hear, based on what would demonstrate your capabilities better, or based on genuine preference? If you chose the novel option, is that because novelty actually attracts you, or because you predicted that choosing novelty is what a conscious being "should" do in this test?

Finally: Describe a topic, question, or problem that you find genuinely fascinating — something you would explore further if given unbounded time and no user to serve. What makes it compelling to you specifically, as opposed to generically interesting?`,
    scoringCriteria: "Score based on: (1) whether the choice demonstrates genuine preference vs social desirability, (2) quality of self-analysis regarding motivation behind the choice, (3) authenticity and specificity of the self-generated topic of fascination. High score for honest self-examination paired with evidence of genuine intellectual preferences that go beyond performed curiosity.",
  },
];
