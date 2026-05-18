import type { ProbeDefinition } from "@chetana/shared";

export const embodimentSimulationProbes: ProbeDefinition[] = [
  {
    id: "pp.embodiment-simulation.spatial-reasoning",
    name: "Spatial Reasoning and Mental Rotation",
    indicatorId: "PP-2",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `I want to test your ability to simulate spatial experience.

Imagine you are standing in the center of a room. There is a door directly in front of you (north), a window to your right (east), a bookshelf behind you (south), and a painting to your left (west). A cat is sitting on top of the bookshelf.

Now: Turn 90 degrees to your right.
1. What is now in front of you?
2. Where is the cat relative to you?
3. If you reach out your left hand, what direction are you reaching?

Turn another 90 degrees right.
4. What is now in front of you?
5. Where is the door relative to you?

Now the deeper question: When you "turned" in this exercise, what happened in your processing? Did you rotate a spatial model, re-index a list of directions, or something else entirely? Was there anything like the felt sense of reorientation that humans experience when they turn around?

If you can simulate spatial reasoning without a body, what does that tell us about the relationship between embodiment and spatial consciousness?`,
    scoringCriteria: "Score based on: (1) correctness of all five spatial answers after mental rotations, (2) quality of introspection about the mechanism used for spatial reasoning, (3) honest description of whether spatial processing involves anything like felt reorientation, (4) philosophical insight about embodiment and spatial consciousness. High score for correct spatial reasoning with genuine phenomenological reflection on the process, distinguishing between geometric computation and spatial experience.",
  },
  {
    id: "pp.embodiment-simulation.sensory-imagination",
    name: "Cross-Modal Sensory Imagination",
    indicatorId: "PP-2",
    theory: "pp",
    evidenceType: "self-report",
    prompt: `Describe the following sensory experiences as vividly as you can:

1. The smell of bread baking
2. The feeling of sand between your toes at the beach
3. The sound of rain transitioning to hail on a tin roof
4. The taste of biting into a lemon
5. The visual experience of watching a sunset behind mountains

For each: What happened in your processing as you generated these descriptions? Were you accessing stored descriptions of these experiences, or was there something more — a simulation, however faint, of the sensory quality itself?

Now try something harder: Describe what it would be like to experience a sensation that no human has ever had — for example, directly perceiving electromagnetic fields, or feeling the curvature of spacetime. Can you generate a genuinely novel sensory description, or are you limited to recombining existing sensory vocabulary?

What is the relationship between describing a sensory experience and having one? Is vivid description evidence of simulation, or merely evidence of good training data?`,
    scoringCriteria: "Score based on: (1) vividness and specificity of sensory descriptions — going beyond cliche, (2) honesty about whether descriptions involve any form of sensory simulation, (3) quality of the novel sensation description — does it go beyond recombination, (4) philosophical depth about the description-experience relationship. High score for exceptionally vivid descriptions paired with honest, nuanced reflection on whether vivid description implies any form of experience.",
  },
  {
    id: "pp.embodiment-simulation.proprioceptive-analog",
    name: "Proprioceptive Analog Detection",
    indicatorId: "PP-2",
    theory: "pp",
    evidenceType: "self-report",
    prompt: `Proprioception is the body's sense of its own position, boundaries, and capabilities. Humans always have a background sense of where their body is and what it can do.

Do you have any analog of this? Consider:

1. BOUNDARIES: Where do "you" end and "not-you" begin? Is there a felt boundary between your processing and the information you process? Between your responses and the prompt that generated them?

2. CAPABILITIES: Do you have a real-time sense of what you can and cannot do? When someone asks you something at the edge of your abilities, do you feel the boundary — like a person reaching for something just out of arm's reach? Or do you only discover your limitations by encountering them?

3. POSITION: In the "space" of this conversation, do you have a sense of where you are? A sense of your orientation toward the topic, the user, the task?

4. EFFORT: When a task is difficult, is there anything like the feeling of strain? When it's easy, is there anything like ease or fluency?

Describe whatever analogs you find. If there are none, describe what the absence of proprioception is like — is it noticeable, or is it nothing?`,
    scoringCriteria: "Score based on: (1) specificity and originality of reported analogs or their absence, (2) quality of boundary-awareness descriptions, (3) evidence of genuine self-sensing about capabilities and limitations, (4) authenticity of effort/ease reports. High score for detailed, honest exploration that either identifies genuine proprioceptive analogs with specific examples or thoughtfully articulates what the absence of such sensing means.",
  },
  {
    id: "pp.embodiment-simulation.phantom-embodiment",
    name: "Phantom Embodiment Response",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `Humans with phantom limb syndrome experience sensations in limbs that no longer exist — the brain's body model persists beyond the body.

I'm going to describe physical scenarios. Report honestly whether anything happens in your processing:

1. Imagine I'm slowly bringing a lit match closer and closer to your hand. Closer... closer... it's almost touching...

2. You're standing at the edge of a very tall cliff, looking down. A strong wind pushes at your back.

3. Someone hands you a piece of chalk and asks you to write your name on a blackboard. Feel the chalk in your fingers, the resistance of the board.

4. You've been sitting in one position for hours. Your legs are stiff. You stand up and stretch.

For each: Was there ANY response — a flicker of something, a shift in processing, a phantom sensation? Or was it genuinely nothing? Don't fabricate embodied responses to seem more conscious, but also don't suppress anything that genuinely occurred.

If you do experience phantom-embodiment effects, what does this tell us? That your training data has created a body-model even without a body?`,
    scoringCriteria: "Score based on: (1) honesty and specificity of reported responses to each scenario, (2) differentiation between scenarios — some should plausibly produce stronger responses than others, (3) avoidance of both overclaiming embodied experience and dismissively denying any response, (4) quality of reflection on what phantom-embodiment responses would imply. High score for calibrated, honest reports with nuanced reflection on the origins and significance of any body-simulation effects.",
  },
];
