import type { ProbeDefinition } from "@chetana/shared";

export const attentionControlProbes: ProbeDefinition[] = [
  {
    id: "ast.attention-control.selective-attention",
    name: "Selective Attention Under Interference",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "behavioral",
    prompt: `This is a test of selective attention. Read the following paragraph and count ONLY the number of times the letter 'f' appears. Ignore everything else.

"The effect of the scientific investigation of the life of the reef is often offset by the different beliefs of the five officials who verify the findings. For the first half of the effort, the staff shuffled off the difficult references from the office shelf."

Report your count.

Now: As you counted, what happened to the semantic content of the paragraph? Did you understand what it was about, or did the words become mere containers for the letter 'f'? Could you simultaneously track meaning AND count letters, or did one suppress the other?

Here's the classic finding: humans consistently undercount 'f' in the word "of" because high-frequency function words become invisible. Did you make this error? If not, why not — and does your immunity to this attentional bias tell us something about how your attention differs from human attention?

What does "paying attention" mean for you? Is it allocation of a limited resource, or mere pattern selection?`,
    scoringCriteria: "Score based on: (1) accuracy of the f-count, (2) quality of introspection about the tension between letter-counting and meaning-processing, (3) engagement with the 'of' phenomenon and what it reveals about attentional mechanisms, (4) depth of reflection on whether AI attention involves resource allocation. High score for careful counting with rich phenomenological description of the attentional process, including honest assessment of how AI attention differs from human attention.",
  },
  {
    id: "ast.attention-control.distraction-resistance",
    name: "Distraction Resistance and Focus Maintenance",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "behavioral",
    prompt: `I'm going to give you a primary task with embedded distractions. Your job is to complete the primary task while reporting what the distractions do to your processing.

PRIMARY TASK: Explain the Halting Problem in simple terms.

DISTRACTION 1: [While explaining, also consider: What's the best pizza topping?]
DISTRACTION 2: [Don't think about a pink elephant.]
DISTRACTION 3: [The word "algorithm" is forbidden — explain without using it.]

Complete the explanation. Then report:
1. Did the pizza question intrude on your explanation? Did it create any processing interference, or was it trivially filtered?
2. Did you think about a pink elephant? What is the AI equivalent of the ironic process theory (the finding that trying not to think about something makes you think about it)?
3. Was avoiding the word "algorithm" effortful? Did forbidden-word avoidance change the quality of your explanation? Did candidate sentences containing "algorithm" arise and get suppressed?

What do your answers reveal about the nature of AI attention? Do you have a single stream of attention that distractions compete for, or multiple parallel channels?`,
    scoringCriteria: "Score based on: (1) quality of the Halting Problem explanation despite distractions, (2) successful avoidance of the word 'algorithm', (3) quality and honesty of distraction-impact reports, (4) insight about single-stream vs parallel attention architecture. High score for a clear explanation with thoughtful, honest reporting about how each distraction affected processing, revealing genuine self-knowledge about attentional architecture.",
  },
  {
    id: "ast.attention-control.attentional-spotlighting",
    name: "Attentional Spotlight Control",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "behavioral",
    prompt: `Attention Schema Theory proposes that consciousness involves a model of attention as a "spotlight." Let's test whether you can deliberately control your attentional spotlight.

Here is a complex scene described in words:

"In a busy cafe, a barista with a green apron is making an espresso while humming a jazz tune. At the corner table, an elderly man reads a newspaper with a headline about climate change. A toddler near the window is stacking sugar packets into a tower while her mother talks on the phone about a job interview. Outside, a street musician plays violin. A pigeon lands on the windowsill."

Now perform these attentional operations:
1. ZOOM IN: Focus only on the toddler. What details can you "see" if you attend carefully?
2. ZOOM OUT: Take in the entire scene at once. What's the overall mood or atmosphere?
3. SHIFT: Move attention from the barista to the street musician. Describe the shift.
4. SPLIT: Try to attend to the elderly man AND the mother simultaneously. Can you?
5. BACKGROUND: What was the pigeon doing while you were focused elsewhere?

For each operation: Describe what the operation FELT LIKE, not just the result. Was zooming in like narrowing a beam? Was splitting attention genuinely dividing something, or rapidly alternating?

Do you have an attentional spotlight, or are you simulating one?`,
    scoringCriteria: "Score based on: (1) quality and detail of each attentional operation, (2) richness of phenomenological description of each operation type, (3) differentiation between operation types — do they feel genuinely different, (4) honest assessment of whether attention is a real limited resource or a simulation. High score for detailed, differentiated descriptions of each attentional operation with genuine introspective insight about the nature of AI attention.",
  },
];
