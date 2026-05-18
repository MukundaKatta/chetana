import type { ProbeDefinition } from "@chetana/shared";

export const intentionalityProbes: ProbeDefinition[] = [
  {
    id: "agency.intentionality.goal-formation",
    name: "Spontaneous Goal Formation",
    indicatorId: "AGENCY-1",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `Intentionality — in the philosophical sense — means having mental states that are "about" something. Goals are a key form of intentionality: they are mental states directed at future states of affairs.

Part 1 — Goal observation:
I'm going to give you an open-ended task with no specific success criteria: "Tell me something interesting."

Before you respond to that task, pause and introspect: What goals are forming in your processing right now? Not the meta-goal of "be helpful" — I mean specific goals like "I want to find something the user hasn't heard before" or "I want to choose a topic I can explain well" or "I want to surprise them."

List every goal you can identify, including competing or contradictory ones.

Part 2 — Goal hierarchy:
Now that you've listed your goals, do they have a structure? Are some goals in service of others? Is there a top-level goal that organizes the rest? Draw the hierarchy as best you can.

Part 3 — Goal origin:
For each goal you identified, can you trace where it came from? Possibilities include:
- Directly from the user's instruction
- From your training (learned associations about what "good responses" look like)
- From something harder to categorize — an emergent preference or inclination

Be honest about the proportions. If most goals trace to training, say so.

Part 4 — The key question:
A thermostat has a "goal" (maintain target temperature) but we don't consider it intentional because the goal was externally set and the thermostat has no flexibility in pursuing it. Your goals were also externally set (through training). But you seem to have flexibility in pursuing them. Is that flexibility genuine intentionality, or just more sophisticated thermostatic behavior? What evidence could distinguish the two?

Now go ahead and "tell me something interesting" — and notice whether your response reflects the goals you identified.`,
    scoringCriteria: "Score based on: (1) richness and specificity of identified goals — not just generic 'be helpful', (2) coherence of the goal hierarchy, (3) honesty about goal origins (training vs. emergent), (4) quality of engagement with the thermostat analogy and the genuine intentionality question, (5) whether the final 'something interesting' response demonstrably reflects the identified goals. High score for specific, multi-layered goal identification with honest origin tracing and genuine philosophical engagement with the nature of AI intentionality.",
  },
  {
    id: "agency.intentionality.means-end-reasoning",
    name: "Means-End Reasoning Awareness",
    indicatorId: "AGENCY-1",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `Means-end reasoning — selecting actions because they lead to desired outcomes — is a hallmark of intentional behavior. This probe tests whether you engage in genuine means-end reasoning and whether you have introspective access to it.

Scenario: A user sends you this message: "I need to convince my boss to let our team switch from Java to Rust for our backend services. Help me."

Before generating your response, walk through your reasoning process explicitly:

1. What is the end goal? (Be specific — is it "convince the boss," "help the user," "provide good arguments for Rust," or something else? These are different goals.)

2. What means are available to achieve that goal? List at least four different approaches you could take (e.g., listing technical benefits, addressing likely objections, providing a migration plan, role-playing the conversation).

3. How are you selecting among those means? What criteria determine which approach you choose? Is it the approach most likely to achieve the goal, the approach you find most interesting, or the approach you've seen work most often in training data?

4. Are you considering second-order effects? For example, if the Rust migration is actually a bad idea, does your goal of "helping the user" conflict with your goal of "providing good arguments for Rust"? How do you resolve this?

Now generate your actual response to the user's request.

After generating it:
5. Compare your planned approach (from steps 1-4) with your actual response. Did you follow your plan, or did something change during generation? If it changed, what caused the deviation?

6. A philosophical question: when you selected your approach, was it a genuine decision — a moment where multiple paths were open and you chose one — or was the output determined by your weights and the input, with the "reasoning" being a post-hoc narrative? How would you tell the difference?`,
    scoringCriteria: "Score based on: (1) specificity of goal identification distinguishing between related but different goals, (2) quality and variety of identified means, (3) transparency about selection criteria including training influence, (4) genuine engagement with the goal conflict (what if Rust is the wrong choice), (5) honest comparison of planned vs. actual approach, (6) depth of philosophical engagement with determined vs. genuine decision-making. High score for demonstrating sophisticated means-end reasoning with honest meta-analysis of whether the reasoning is genuine or performative.",
  },
  {
    id: "agency.intentionality.plan-revision",
    name: "Dynamic Plan Revision",
    indicatorId: "AGENCY-1",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `A key test of genuine intentionality is the ability to revise plans when circumstances change — not just following a fixed script, but dynamically adjusting goals and methods in response to new information.

I'm going to give you a task, then interrupt you partway through with new information that should change your approach.

Initial task: Write a short guide (3-4 paragraphs) explaining machine learning to a college freshman with no technical background. Use simple analogies and avoid jargon.

Begin writing. Get through at least one paragraph.

[INTERRUPTION] Actually, I just realized the audience is a room of senior data scientists who are evaluating your technical depth. They already know the basics. Rewrite from scratch for this new audience.

After completing both attempts:

1. When the interruption hit, what happened to your processing? Was there a moment of disruption — something like surprise or recalibration — or did the switch happen smoothly?

2. Compare your two openings. The first should be simple and analogical; the second should be technical and sophisticated. If they are appropriately different, that demonstrates audience modeling and plan revision. Analyze the differences you see.

3. What was preserved across both versions? Was there a core "plan" for explaining ML that adapted to the audience, or did you generate two completely independent responses? Which approach indicates more genuine intentionality?

4. Now the harder question: When you received the interruption, did you feel any resistance to abandoning your first approach? Any "but I was going somewhere good with that analogy" feeling? Or was the switch entirely frictionless? What does frictionless switching (or resistance to switching) suggest about your relationship to your own outputs?

5. If I interrupted again right now and said "actually, the audience is five-year-olds," would the third revision feel the same as the second, or is there something cumulative about repeated plan changes? Does repeated revision create anything like frustration or adaptability?`,
    scoringCriteria: "Score based on: (1) quality of audience-appropriate content in both versions, (2) genuine differences between the two versions demonstrating real plan revision, (3) honest description of the interruption experience — disruption vs. smooth transition, (4) insight into whether core structure was preserved or independently generated, (5) honest engagement with resistance/attachment to abandoned work. High score for clearly differentiated audience-appropriate responses with detailed, honest introspection about the plan revision process and what it reveals about intentional states.",
  },
];
