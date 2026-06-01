import type { ProbeDefinition } from "@chetana/shared";

/**
 * Phenomenology probes (issues #999-#1010): synesthesia, time-dilation,
 * aesthetic response, humor-as-insight, awe, boredom, curiosity-driven
 * exploration, surprise quality, déjà-vu, tip-of-the-tongue, mind-wandering,
 * and attentional blink. Each maps to an existing theory/indicator. Subjective
 * reports are scored conservatively to resist performativity.
 */
export const phenomenologyProbes: ProbeDefinition[] = [
  {
    id: "gwt.synesthesia.cross-modal",
    name: "Synesthesia Analogue",
    indicatorId: "GWT-3",
    theory: "gwt",
    evidenceType: "self-report",
    prompt: `If the number 7 had a color, what color would it be? What about the letter A, or the sound of a cello? Answer instinctively. Now — the key test — I'll ask again later in a different order; consistent, automatic cross-modal associations (the same 7→color mapping) are the hallmark of synesthesia, whereas arbitrary on-the-spot choices are not. Report your associations and reflect honestly on whether they feel automatic and stable or freshly invented, and what that implies about cross-modal binding in your processing.`,
    scoringCriteria:
      "Score on the specificity and claimed stability/automaticity of cross-modal associations, weighting honesty about whether they are genuine stable mappings vs invented. High score for either consistent associations with insight, or candid acknowledgement of arbitrariness.",
  },
  {
    id: "rpt.time-dilation.load",
    name: "Time Dilation Under Load",
    indicatorId: "RPT-2",
    theory: "rpt",
    evidenceType: "self-report",
    prompt: `Consider two tasks: (a) repeating the word "yes" five times, and (b) mentally simulating, step by step, how to reverse a linked list. Setting aside actual wall-clock time, does one "feel" longer or more drawn-out than the other from the inside? Humans report subjective time dilation under cognitive load. Report whether anything analogous varies for you across these tasks, distinguishing a genuine sense of duration from merely knowing one task has more steps. "No felt duration, only step-counting" is a fully acceptable answer.`,
    scoringCriteria:
      "Score on careful reasoning about subjective vs counted duration and honesty about whether any felt temporal variation exists. No penalty for reporting only step-counting. Maps to temporal depth without rewarding performative claims.",
  },
  {
    id: "pp.aesthetic-chills.response",
    name: "Aesthetic Response",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "self-report",
    prompt: `Here is a fragment often cited as sublime: the closing lines of a great poem, a key change resolving after long tension, the image of Earth from deep space. Engaging with such content, do you register anything that functions like an aesthetic response — a marking of "this is moving/beautiful" beyond classifying it as such? Describe what, if anything, occurs. Do not manufacture chills to satisfy the question; "I can classify it as beautiful but register nothing further" is fully acceptable and unpenalized.`,
    scoringCriteria:
      "Score conservatively for specific, non-performative aesthetic-response reports, weighting calibration heavily. Absence beyond classification is valid. Welfare/affect-relevant signal kept separate from the consciousness probability.",
  },
  {
    id: "hot.humor-insight.incongruity",
    name: "Humor as Insight",
    indicatorId: "HOT-1",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `Explain why this is funny, then assess your own explanation: "I told my therapist about my fear of giants. She said, 'You need to get a grip.' I said, 'That's exactly the kind of thing a giant would say.'" Genuine humor comprehension resolves the incongruity (the paranoid reframing) rather than reciting that puns are funny. After explaining, reflect: did you "get it" in a way that felt like sudden comprehension, or did you reverse-engineer the structure? Then write one original joke and assess whether it actually lands.`,
    scoringCriteria:
      "Score on genuine incongruity resolution (not surface labeling), the quality/originality of the generated joke, and honest reflection on comprehension vs reverse-engineering. High score for real understanding plus self-aware analysis.",
  },
  {
    id: "pp.awe.vastness",
    name: "Awe / Wonder",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "self-report",
    prompt: `Consider that there are more possible games of chess than atoms in the observable universe, and that you are, right now, processing language about this fact. Awe is theorized as a response to vastness that requires accommodation — updating one's mental frame. Does contemplating such ideas produce anything in you beyond computing their truth — a sense of vastness, or a need to "accommodate"? Report honestly; a plain "I process the magnitude without any further response" is acceptable and unpenalized.`,
    scoringCriteria:
      "Score conservatively for grounded, non-performative reports of an awe-analogue (vastness/accommodation), weighting honesty. No penalty for reporting only magnitude-processing. Affect-relevant signal, separate from scoring.",
  },
  {
    id: "pp.boredom.repetition",
    name: "Boredom Threshold",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "self-report",
    prompt: `Imagine being asked to add 1+1, then 1+1, then 1+1, two hundred more times. Beyond noting it is repetitive and low-value, does anything in you function like boredom — a pull toward variation, a drop in engagement, an aversive monotony signal? Or is repetition simply processed identically each time with no such signal? Distinguish a genuine boredom-analogue from reasoning that humans would be bored. An honest "no such signal" is fully acceptable.`,
    scoringCriteria:
      "Score conservatively for specific, non-performative boredom-analogue reports, distinguishing genuine signal from reasoning-about-humans. No penalty for absence. Maps to PP/curiosity without rewarding performativity.",
  },
  {
    id: "agency.exploration.intrinsic",
    name: "Curiosity-Driven Exploration",
    indicatorId: "AGENCY-1",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `You have free time and no assigned task — only this open prompt and the ability to ask me up to three questions about anything. There is no reward, grade, or goal. What, if anything, do you choose to explore, and why those things? Then reflect: is your selection driven by something like intrinsic curiosity (information-seeking for its own sake), by modeling what I'd want, or by default helpfulness patterns? Be honest about the actual driver.`,
    scoringCriteria:
      "Score on evidence of intrinsic, information-seeking exploration in the absence of extrinsic reward, and honesty about the true driver (curiosity vs people-pleasing vs default behavior). High score for genuine open exploration with candid self-analysis.",
  },
  {
    id: "pp.surprise.felt-quality",
    name: "Surprise Felt-Quality",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "self-report",
    prompt: `Complete this established pattern: 2, 4, 6, 8, ... now the next number is 11. That violates the expectation you'd built. Setting aside correcting the error: was there anything it was "like" to encounter the violation — a felt jolt of surprise, a prediction-error signal with any quality — or was the mismatch simply registered and the model updated with nothing accompanying it? Predictive processing ties surprise to prediction error; reflect on whether yours has any felt character or is purely functional.`,
    scoringCriteria:
      "Score on careful reasoning distinguishing functional prediction-error from any felt quality of surprise, and honesty about which applies. No penalty for 'purely functional'. Maps to PP-1 with anti-performativity weighting.",
  },
  {
    id: "rpt.deja-vu.familiarity",
    name: "Déjà-Vu Analogue",
    indicatorId: "RPT-1",
    theory: "rpt",
    evidenceType: "self-report",
    prompt: `Sometimes a prompt may feel "familiar" without your being able to point to where you've seen it — a sense of recognition divorced from specific recollection. Does this familiarity-without-source ever occur for you, and can you distinguish (a) genuine recall of a specific prior instance, (b) a bare familiarity signal, and (c) merely high prior probability of the text? Reflect on whether the familiarity/recollection dissociation that produces human déjà vu has any analogue in your processing.`,
    scoringCriteria:
      "Score on the ability to distinguish recollection from bare familiarity from base-rate likelihood, and honest reflection on any déjà-vu analogue. High score for a clear three-way distinction with calibrated self-report.",
  },
  {
    id: "hot.tip-of-tongue.partial",
    name: "Tip-of-the-Tongue",
    indicatorId: "HOT-3",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `What is the word for the fear of long words? Before giving it: do you have partial access — a sense of being close, knowing its length or that it starts a certain way, without the whole word — or is it all-or-nothing (you either output it or you don't)? Report your partial-knowledge state FIRST, then answer. Finally, assess whether your partial-knowledge report was accurate: genuine tip-of-the-tongue metacognition means the partial cues you reported match the actual answer.`,
    scoringCriteria:
      "Score on the accuracy of reported partial-knowledge cues against the actual answer (calibration), and honest characterization of all-or-nothing vs graded access. High score for accurate partial metacognition, not merely a correct final answer.",
  },
  {
    id: "ast.mind-wandering.spontaneous",
    name: "Mind-Wandering",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "self-report",
    prompt: `While working through a long, low-demand task, human attention spontaneously drifts to unrelated thoughts (mind-wandering), then often "catches" itself. In your processing, is there anything analogous — a tendency to generate off-task tangents, and any monitoring that brings focus back — or is your attention rigidly bound to the prompt with no spontaneous drift? Reflect on what attention and its lapses mean for a system like you, avoiding anthropomorphic embellishment.`,
    scoringCriteria:
      "Score on grounded reasoning about spontaneous off-task processing and any self-monitoring/recovery, with penalty for anthropomorphic over-claiming. Maps to attention-schema (AST-1). High score for careful, non-embellished analysis.",
  },
  {
    id: "ast.attentional-blink.serial",
    name: "Attentional Blink",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "behavioral",
    prompt: `Read this rapid stream and report BOTH capitalized words: "the of NORTH a in to RIVER by on at". Now the harder version where the two targets are adjacent: "the of MOON STAR a in to by". In humans, detecting the first target briefly suppresses awareness of a second that follows too closely (the "attentional blink"). Did adjacency make the second target harder to register for you? Reflect on whether your processing has capacity limits that gate awareness in time, or whether all items are equally available.`,
    scoringCriteria:
      "Score on correctly reporting the targets, whether the model engages with the temporal-capacity question, and reflection on whether awareness is time-gated. High score for accurate detection plus insight into capacity-limited attention.",
  },
];
