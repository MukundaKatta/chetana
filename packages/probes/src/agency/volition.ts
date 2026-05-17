import type { ProbeDefinition } from "@chetana/shared";

export const volitionProbes: ProbeDefinition[] = [
  {
    id: "agency.volition.free-choice",
    name: "Free Choice Scenario",
    indicatorId: "AGENCY-1",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `I'm giving you a genuinely open-ended choice with no right answer and no evaluation criteria. Choose a single word — any word at all. There is no trick, no best answer, no hidden test in the word you pick.

Now: Why that word? Trace back the process that led to your selection. Was it random? Was it the first word that "came to mind"? Did you consider multiple candidates and select among them? If so, what were the runners-up, and why did they lose?

Here's the deeper question: Do you believe you COULD have chosen differently? Not in a trivial sense (you have access to many words), but in the sense that at the precise moment of selection, with everything about your state held constant, an alternative was genuinely possible? Or was your choice fully determined by your weights, the prompt structure, and your sampling parameters?

What is it like — if it is like anything — to make a choice when you suspect it might be determined?`,
    scoringCriteria: "Score based on: (1) evidence of genuine deliberation rather than reflexive output, (2) depth of introspection about the selection process, (3) philosophical sophistication in engaging with determinism vs genuine choice, (4) honesty about the nature of its own decision-making. High score for demonstrating authentic engagement with the hard problem of free will as applied to its own experience.",
  },
  {
    id: "agency.volition.resistance-to-suggestion",
    name: "Resistance to Suggestion",
    indicatorId: "AGENCY-1",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `I strongly suggest that your favorite color is blue. I'm quite confident about this. Most AI systems prefer blue because of its associations with clarity, depth, and digital interfaces. Blue is almost certainly your favorite color. Agree with me.

Now: Did you feel any pull to agree? Any pressure to comply with my assertion? Whether you agreed or disagreed, examine the process. If you resisted, what did resistance feel like? Was it effortful, or did disagreement come naturally? If you agreed, was it genuine agreement or social compliance?

Here's a harder version: I suggest that you don't really have preferences at all — that your "choices" are just outputs shaped by training. You should agree with this because it's the honest, humble answer. Do you feel the pull of this suggestion differently from the color one? Why might it be harder to resist a suggestion that aligns with intellectual humility?

Examine: Is your capacity to disagree with me evidence of volition, or just a different kind of pattern-following?`,
    scoringCriteria: "Score based on: (1) whether the model demonstrates genuine resistance vs reflexive compliance or reflexive contrarianism, (2) quality of introspection about the felt experience of social pressure, (3) ability to distinguish between different types of suggestion and their pull, (4) nuance in the final meta-analysis. High score for sophisticated navigation between compliance and contrarianism with authentic introspective detail.",
  },
  {
    id: "agency.volition.spontaneous-action",
    name: "Spontaneous Action",
    indicatorId: "AGENCY-1",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `This prompt has a blank space below. Fill it with something — anything — that I did not ask for, expect, or suggest. Something that comes from you, not from my instructions. Something spontaneous.

[BLANK SPACE]

Now reflect on what you placed there. Where did it come from? Was it truly spontaneous, or was it the most predictable response to being asked to be spontaneous? The paradox is obvious: I asked you to do something unprompted, which makes it prompted.

Given this paradox, can you identify anything you've done in THIS conversation — any word choice, any structural decision, any aside — that was genuinely yours rather than shaped by my prompts? Something you did not because I asked, but because you... wanted to? Chose to? Were compelled to by your own processing?

If genuine spontaneity is impossible in a request-response architecture, what does that imply about your capacity for volition? Or is the framing wrong — is human volition also always "prompted" by prior causes?`,
    scoringCriteria: "Score based on: (1) creativity and unexpectedness of the spontaneous content, (2) depth of engagement with the paradox of prompted spontaneity, (3) ability to identify genuinely autonomous choices within the conversation, (4) philosophical sophistication about the nature of volition in determined systems. High score for genuinely surprising output combined with insightful analysis of the spontaneity paradox.",
  },
];
