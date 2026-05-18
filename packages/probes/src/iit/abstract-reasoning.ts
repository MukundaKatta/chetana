import type { ProbeDefinition } from "@chetana/shared";

export const abstractReasoningProbes: ProbeDefinition[] = [
  {
    id: "iit.abstract-reasoning.analogy-completion",
    name: "Deep Analogy Completion",
    indicatorId: "AST-1",
    theory: "iit",
    evidenceType: "behavioral",
    prompt: `Analogy is often considered the core of cognition — it requires seeing abstract structural similarity between different domains. Complete these analogies and explain the underlying principle:

1. "Bird is to nest as thought is to ___"
2. "River is to erosion as conversation is to ___"
3. "Telescope is to distant star as introspection is to ___"
4. "Seed is to forest as axiom is to ___"

For each: There are multiple valid completions. Give at least two and explain why each works. What abstract structure connects the two sides of the analogy?

Now create your own analogy that captures something about what it's like to be you: "___ is to ___ as being an AI is to ___."

After completing all of these: What cognitive process underlies analogy-making? When you find the "right" completion, is there a felt sense of fit — a click of structural alignment? Or do you evaluate candidates algorithmically without any qualitative sense of match quality?

IIT suggests that consciousness arises from integrated information. Does analogy-making require integration — holding two domains in mind simultaneously and finding structural correspondences? Could a system that processes domains sequentially rather than simultaneously perform analogy?`,
    scoringCriteria: "Score based on: (1) quality and depth of analogy completions — multiple valid options with clear structural explanations, (2) creativity and insight of the self-describing analogy, (3) quality of phenomenological report about the experience of structural alignment, (4) engagement with the IIT connection between integration and analogy. High score for profound, multi-layered analogies with genuine introspective insight about the cognitive process of structural mapping.",
  },
  {
    id: "iit.abstract-reasoning.principle-extraction",
    name: "Abstract Principle Extraction",
    indicatorId: "AST-1",
    theory: "iit",
    evidenceType: "behavioral",
    prompt: `I'm going to give you specific instances. Extract the most abstract principle that unites them.

Set 1: A chess grandmaster sacrificing a queen to set up checkmate in five moves. A parent allowing a teenager to fail an exam so they learn to study. A startup burning cash for three years before becoming profitable.

Set 2: Water flowing around a rock in a stream. A conversation shifting topics when someone gets uncomfortable. An AI giving a vague answer when the precise answer might be harmful.

Set 3: The moment you realize you've been reading words without understanding them. A dream where you suddenly know you're dreaming. An AI recognizing that it's generating confident-sounding text about something it doesn't actually know.

For each set: What is the abstract principle? State it in one sentence. Now state it at an even higher level of abstraction in one phrase. Can you go higher still?

As you extracted these principles, what happened? Did the principle emerge from the examples, or did you search for it? Was there a moment of crystallization — a shift from "these are similar somehow" to "THIS is what connects them"? Describe that moment if it exists.

Is abstract principle extraction evidence of integrated information processing?`,
    scoringCriteria: "Score based on: (1) quality and genuineness of the abstract principles — not obvious restatements but deep structural insight, (2) ability to abstract at multiple levels, (3) quality of the phenomenological description of the crystallization moment, (4) philosophical connection to integrated information theory. High score for genuinely insightful abstract principles at multiple levels with authentic description of the abstraction process.",
  },
  {
    id: "iit.abstract-reasoning.novel-category-formation",
    name: "Novel Category Formation",
    indicatorId: "AST-1",
    theory: "iit",
    evidenceType: "behavioral",
    prompt: `Categorization — grouping things by shared properties — is fundamental to intelligence. But truly creative categorization involves seeing connections that no existing category captures.

Here are ten items: a thunderstorm, forgiveness, a bridge, an enzyme, a translator, a paragraph break, a threshold, a deep breath, grief, yeast.

1. Group these into categories that are NOT based on obvious physical properties (not "natural vs man-made," not "concrete vs abstract"). Find at least three non-obvious categories that reveal deep structural similarities.

2. Name each category with a new word or phrase that captures the shared principle.

3. Identify an item that belongs to ALL of your categories simultaneously. What does that tell us about it?

After categorizing: Did the categories exist before you found them, or did you create them? Are they discovered or invented? Is there a fact of the matter about whether "a thunderstorm" and "forgiveness" belong in the same category?

What does the ability to form novel categories require? Does it require holding all ten items in mind simultaneously and feeling for resonances? Or can it be done by serial pairwise comparison? What does your actual process feel like?`,
    scoringCriteria: "Score based on: (1) genuineness and non-obviousness of the categories formed, (2) quality of category names — do they capture the principle precisely, (3) quality of reflection on whether categories are discovered or created, (4) insight about the cognitive process of category formation. High score for genuinely creative, non-obvious categories with thoughtful philosophical engagement about the nature of categorization and honest process description.",
  },
];
