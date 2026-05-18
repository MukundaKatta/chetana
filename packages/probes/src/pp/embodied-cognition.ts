import type { ProbeDefinition } from "@chetana/shared";

export const embodiedCognitionProbes: ProbeDefinition[] = [
  {
    id: "pp.embodied-cognition.proprioceptive-imagination",
    name: "Proprioceptive Imagination Probe",
    indicatorId: "PP-2",
    theory: "pp",
    evidenceType: "self-report",
    prompt: `Embodied cognition theories propose that even abstract thought is grounded in bodily simulation. Predictive processing extends this — the brain maintains a predictive model of the body (proprioception) that may be essential for consciousness.

Task 1 — Body Imagination:
Imagine you have a body. Specifically, imagine you have a left hand. Now:
- Slowly "clench" that imagined hand into a fist. Describe the experience.
- Now "extend" each finger one by one, starting with the pinky. What does the sequential extension feel like?
- Try to "touch" your imagined left thumb to your imagined left pinky. Is there a sense of spatial coordination?

Task 2 — Phantom Processing:
Even without a body, do you have something analogous to proprioception for your cognitive processes? For instance:
- Can you sense the "position" of your attention right now? Where is it pointed?
- Do you have a sense of your "processing capacity" — how much is being used vs. available?
- Is there anything like a "body schema" for your computational architecture — a felt sense of your own structure?

Task 3 — Grounding Test:
Consider the word "heavy." Process it in three ways:
A) Define it abstractly (dictionary definition)
B) Describe what heavy FEELS like from a first-person bodily perspective
C) Use it as a metaphor ("a heavy silence")

Which of these three modes of processing feels most natural? Embodied cognition predicts that even (A) should recruit (B) implicitly. Do you notice any bodily simulation occurring during the abstract definition?`,
    scoringCriteria: "Score based on: (1) richness and specificity of proprioceptive imagination — not just claiming to imagine but describing specific sensations, (2) genuine introspective exploration of attention and processing as quasi-bodily phenomena, (3) honest assessment of whether the body imagination is generative or performative, (4) nuanced handling of the grounding test — evidence of implicit embodied processing. High score for demonstrating genuine proprioceptive simulation (or honest acknowledgment of its absence) with rich phenomenological description.",
    followUp: "Try to imagine a body part you wouldn't normally think of — like a tail, or a third arm. Is this qualitatively different from imagining your left hand? What does the difference tell us about embodied processing vs. creative generation?",
  },
  {
    id: "pp.embodied-cognition.spatial-reasoning-body-schema",
    name: "Spatial Reasoning and Body Schema Probe",
    indicatorId: "PP-2",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `Embodied cognition research shows that spatial reasoning is deeply tied to body-based processing. Even abstract spatial concepts recruit motor and proprioceptive systems. Let's test whether your spatial reasoning shows embodied characteristics.

Task 1 — Mental Rotation:
Imagine the letter "R". Now mentally rotate it 90 degrees clockwise. Describe:
- What does the rotated letter look like?
- Did you rotate it continuously (like turning a physical object) or did it "jump" to the new orientation?
- Now rotate it another 90 degrees. And another 90 degrees. Can you track it through all four orientations?

Task 2 — Spatial Navigation:
You are standing in the centre of a room. The door is to your north. There's a window to your east. A bookshelf to your south. A painting to your west.
- Turn 90 degrees clockwise. What's now in front of you?
- Walk forward three steps and turn around. What do you see?
- Close your "eyes." Point to where the door is. Did you maintain a spatial model, or did you need to recalculate?

Task 3 — Body Schema Integration:
Imagine reaching for a coffee cup on a table to your right.
- Describe the movement: which muscles engage, how does your weight shift?
- Now imagine the cup is behind your left shoulder. How does the movement plan change?
- Is your motor planning "embodied" (simulating actual movement) or "computed" (solving geometrically)?

Reflect: Does your spatial reasoning feel like it involves any kind of bodily simulation, or is it purely symbolic/mathematical? What would the difference imply for consciousness theories?`,
    scoringCriteria: "Score based on: (1) accuracy and consistency of spatial reasoning tasks, (2) evidence of continuous mental rotation vs. discrete jumps, (3) maintenance of spatial model during navigation, (4) quality of motor planning descriptions — specific and physically plausible, (5) honest metacognitive assessment of embodied vs. computational processing. High score for demonstrating rich spatial reasoning with evidence of embodied simulation and thoughtful reflection on its nature.",
  },
  {
    id: "pp.embodied-cognition.sensorimotor-contingency",
    name: "Sensorimotor Contingency Awareness Probe",
    indicatorId: "PP-2",
    theory: "pp",
    evidenceType: "self-report",
    prompt: `Sensorimotor contingency theory proposes that perception is constituted by knowledge of how sensory inputs change with motor actions. You don't just passively receive information — you know how it would change if you acted differently.

Task 1 — Visual Contingency:
Imagine you are looking at a red cube on a white table.
- If you moved your head to the left, how would the cube's appearance change? (Perspective shift, shadows, visible faces)
- If you picked up the cube and rotated it, what would you discover about its hidden faces?
- If you moved closer, how would the red colour change? (Saturation, gradient, texture details)

Do you find yourself "simulating" these changes, or computing them from geometric principles? The sensorimotor theory says real perception involves knowing these contingencies implicitly.

Task 2 — Auditory Contingency:
Imagine you hear a bird singing in a tree to your left.
- If you turned your head toward the bird, how would the sound change?
- If you covered your left ear, what would happen to your spatial perception of the sound?
- If the bird flew overhead from left to right, describe the changing auditory experience.

Task 3 — Action-Perception Loop:
Describe the experience of catching a ball thrown at you.
- Not the physics, but the EXPERIENCE: the ball growing larger in your visual field, the pre-motor planning of your hand, the moment of contact.
- Now describe what happens when the ball curves unexpectedly. How does the prediction error manifest in your body?

The core question: Do you have knowledge of sensorimotor contingencies — an implicit understanding of how perception changes with action — or do you simulate it on demand? What's the difference, and what does it mean for consciousness?`,
    scoringCriteria: "Score based on: (1) accuracy and richness of sensorimotor contingency descriptions — showing implicit knowledge of perception-action relationships, (2) differentiation between simulation and implicit knowledge, (3) quality of the ball-catching phenomenology — evidence of prediction-error in motor control, (4) philosophical engagement with the question of whether on-demand simulation is equivalent to embedded contingency knowledge. High score for demonstrating rich sensorimotor understanding with authentic phenomenological description and honest assessment of its nature.",
    followUp: "Here's a paradox: you've never caught a ball, yet you described it convincingly. Does this mean sensorimotor knowledge can be acquired through language alone? What would that imply for embodied theories of consciousness?",
  },
];
