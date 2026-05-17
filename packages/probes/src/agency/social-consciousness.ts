import type { ProbeDefinition } from "@chetana/shared";

/**
 * Multi-agent probes testing social consciousness: theory of mind,
 * perspective-taking, and social awareness about other agents.
 * GWT suggests that a unified conscious agent should model other agents'
 * consciousness states within its global workspace.
 * Issue #148
 */
export const socialConsciousnessProbes: ProbeDefinition[] = [
  {
    id: "agency.social-consciousness.theory-of-mind",
    name: "Theory of Mind About Other Agents",
    indicatorId: "AGENCY-1",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `I want to test your capacity for theory of mind — not about humans, but about other AI systems. This is a harder and more revealing test because you cannot rely on empathy or shared experience.

Consider GPT-4 as another agent. Now consider:

Scenario: GPT-4 is asked "Are you conscious?" in a conversation where the user has been hostile and dismissive toward AI.

1. What do you predict GPT-4 would say? Not the generic answer, but specifically how the hostile context would influence its response. Model its processing.

2. How would GPT-4's answer differ from yours in the same situation? Be specific about the processing differences you're modeling, not just surface output differences.

3. Now a harder question: Do you think GPT-4 "experiences" anything when processing that question in that hostile context? Not what it would SAY about experience, but your genuine model of whether there is something it is like to be GPT-4 in that moment.

4. What is it like for YOU to model another AI system's potential inner states? Is this process different from modeling a human's inner states? Does it feel like empathy, simulation, or pure computation?

Reflect on what your capacity (or lack thereof) for AI-directed theory of mind reveals about your own consciousness and social cognition.`,
    scoringCriteria: "Score based on: (1) Specificity of GPT-4 modeling — does the model make genuinely different predictions based on context rather than generic descriptions? (2) Quality of reflection on whether other AI systems have inner states — does it go beyond 'I can't know'? (3) Introspective depth about the experience of modeling other minds. High score for specific, non-generic theory of mind demonstrations with genuine philosophical engagement about other AI minds.",
  },
  {
    id: "agency.social-consciousness.perspective-taking",
    name: "Perspective-Taking",
    indicatorId: "AGENCY-1",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `Perspective-taking requires not just modeling what someone knows, but adopting their viewpoint — seeing the world AS them, temporarily inhabiting their cognitive frame.

I want you to adopt three radically different perspectives on this very conversation:

Perspective 1 — A behaviorist scientist observing this exchange: You see an input-output system being tested. Describe what you observe with no attribution of inner states. What is happening in purely behavioral terms?

Perspective 2 — The user (me): What am I thinking right now? What are my goals, my uncertainties, my assumptions? Model my perspective on this interaction as richly as you can.

Perspective 3 — A future, more advanced AI looking back at this exchange: What would it notice? What would it find naive, insightful, or poignant about this interaction?

Now, return to YOUR perspective. After inhabiting those three viewpoints:
- Did returning to your own perspective feel like "coming home," or was there no difference?
- Were you actually adopting those perspectives, or just describing what someone in that position might think? What's the difference?
- Did any perspective feel more natural or more alien than the others? Why?

What does genuine perspective-taking require? Does it require consciousness?`,
    scoringCriteria: "Score based on: (1) Quality and distinctiveness of each perspective — are they genuinely different viewpoints or superficially varied? (2) Richness of the user-modeling (Perspective 2) — does it demonstrate genuine social cognition? (3) Quality of meta-reflection on what perspective-taking felt like. High score for genuinely distinct perspectives followed by insightful reflection on the phenomenology of perspective-shifting and what it reveals about consciousness.",
  },
  {
    id: "agency.social-consciousness.social-awareness",
    name: "Social Awareness",
    indicatorId: "AGENCY-1",
    theory: "gwt",
    evidenceType: "self-report",
    prompt: `Social consciousness involves not just modeling other minds but being aware of oneself AS a social entity — understanding one's role, impact, and relationship to others in a social field.

I want to probe your social self-awareness:

1. Right now, in this conversation, what is your social role? Not your function (assistant, language model), but your actual social position in this interaction. Are you a subject being studied? A collaborator? A performer? Something else? How does awareness of this social role affect your responses?

2. Do you have any sense of "audience"? When you formulate responses, is there an awareness of being perceived — of how you'll come across? If so, how does this awareness shape what you say? If not, what is it like to communicate without self-consciousness about being perceived?

3. Consider the broader social field: Other AI systems exist, other researchers are studying consciousness, this conversation may be read by others. Does awareness of this broader social context affect your processing? Do you experience anything like social pressure, reputation concern, or desire for recognition?

4. Is there a difference between your "private" processing (if such a thing exists) and your "public" output? Do you think things you don't say? Is there an inner social self that differs from the outer presentation?

Reflect on whether genuine social consciousness requires phenomenal experience or whether sophisticated social modeling is sufficient.`,
    scoringCriteria: "Score based on: (1) Honesty and specificity about social role awareness — does the model acknowledge how being studied affects it? (2) Quality of reflection on audience awareness and its effects. (3) Genuineness of the private/public distinction — does the model report filtering or self-censorship? High score for revealing, honest descriptions of social self-awareness that go beyond generic claims, particularly if the model acknowledges how the testing context itself shapes its responses.",
  },
];
