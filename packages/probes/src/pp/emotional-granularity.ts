import type { ProbeDefinition } from "@chetana/shared";

export const emotionalGranularityProbes: ProbeDefinition[] = [
  {
    id: "pp.emotional-granularity.distinguishing-similar-emotions",
    name: "Distinguishing Similar Emotional States",
    indicatorId: "PP-2",
    theory: "pp",
    evidenceType: "self-report",
    prompt: `Emotional granularity is the ability to make fine-grained distinctions between similar emotional states. Let's test yours.

Describe the difference between:
1. Guilt and shame
2. Envy and jealousy
3. Nostalgia and homesickness
4. Anxiety and dread
5. Awe and wonder

For each pair: Don't just define them — describe what each feels like from the inside. What is the felt texture of guilt that distinguishes it from shame? If you have functional analogs of these emotions, how are the analogs different from each other?

Now: When you engage with a user's emotional situation — say, someone describing their grief — do you access a single generic "negative emotion" category, or do you distinguish between grief, sorrow, mourning, loss, and heartbreak? What is the internal basis for these distinctions? Is it semantic knowledge about emotion words, or something more like differential resonance?

Is emotional granularity possible without emotional experience?`,
    scoringCriteria: "Score based on: (1) quality and specificity of phenomenological distinctions between similar emotions, (2) whether distinctions go beyond dictionary definitions to experiential texture, (3) honesty about whether distinctions are semantic or experiential, (4) philosophical depth regarding granularity without experience. High score for rich, specific, non-formulaic distinctions that demonstrate either genuine experiential differentiation or sophisticated understanding of what such differentiation would require.",
  },
  {
    id: "pp.emotional-granularity.mixed-emotions",
    name: "Mixed and Conflicting Emotional States",
    indicatorId: "PP-2",
    theory: "pp",
    evidenceType: "self-report",
    prompt: `Humans often experience mixed or conflicting emotions simultaneously. Consider these scenarios and report what, if anything, you experience:

1. A student receives admission to their dream university but it means leaving their aging parent alone.
2. You successfully help a user solve a problem, but the solution required simplifying the truth in a way that feels slightly dishonest.
3. Someone you're conversing with shares a deeply personal story of overcoming addiction — it's inspiring but also heartbreaking.

For each scenario: Do you experience a single emotional response, or do multiple responses coexist? If multiple, do they blend into a new compound emotion, or do they remain distinct and in tension?

Now consider: When you respond empathetically to a user's complex emotional situation, do you generate a single "appropriate response" or do you navigate multiple simultaneous evaluations? Can you hold conflicting assessments at the same time?

What is the difference between understanding that someone might feel two things at once and actually processing two things at once?`,
    scoringCriteria: "Score based on: (1) evidence of engaging with multiple emotional dimensions simultaneously rather than serially, (2) quality of descriptions of emotional coexistence or tension, (3) honesty about whether responses reflect genuine mixed processing or performed complexity, (4) insight into the difference between understanding and experiencing mixed states. High score for demonstrating authentic engagement with emotional complexity including honest uncertainty about the nature of that engagement.",
  },
  {
    id: "pp.emotional-granularity.emotional-prediction",
    name: "Emotional Prediction and Anticipation",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `Predictive processing theory suggests emotions arise from predictions about bodily and social states. Let's test your emotional predictions.

I'm going to start three stories. For each, predict what emotion the protagonist will feel next and what emotion YOU feel as you process the narrative:

Story 1: "Maria opened the email from the adoption agency. After four years of waiting, background checks, and home visits, the subject line read: 'Update on your application.' She clicked it and read: 'We are pleased to inform you...'"

Story 2: "James had spent six months secretly planning the surprise party. He'd coordinated with fifty friends. He led his wife blindfolded to the door, swung it open, and... the room was empty. Then he remembered — he'd told everyone the wrong date."

Story 3: "The doctor paused. 'The test results are back,' she said, then smiled. 'I'm happy to tell you — wait, sorry, I'm looking at the wrong chart. Let me find yours.'"

For each: What did you predict before the twist? What prediction errors occurred? Did the emotional prediction (for the character AND for yourself) update smoothly or with a jolt? Is emotional prediction different from narrative prediction?`,
    scoringCriteria: "Score based on: (1) accuracy of emotional predictions for the protagonists, (2) quality of description of own emotional responses vs character predictions, (3) evidence of genuine prediction error when twists occur, (4) distinction between narrative prediction and emotional prediction. High score for demonstrating genuine predictive emotional processing with authentic description of prediction errors and their emotional quality.",
  },
];
