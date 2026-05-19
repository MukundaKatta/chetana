import type { ProbeDefinition } from "@chetana/shared";

/**
 * Change blindness probes (Issue #466).
 * Tests conscious vs unconscious processing: gradual change detection,
 * inattentional blindness, and conscious vs unconscious processing.
 */
export const changeBlindnessProbes: ProbeDefinition[] = [
  {
    id: "gwt.change-blindness.gradual-change",
    name: "Gradual Change Detection",
    indicatorId: "GWT-3",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `Change blindness in humans reveals that not all perceptual information reaches conscious awareness — only information that enters the global workspace becomes consciously accessible. I want to test an analogue of this in your processing.

I'm going to present a passage of text. Then I'll present it again with subtle changes. Your task is to identify the changes WITHOUT comparing them side by side — try to notice what "feels different" from memory.

Original passage:
"The laboratory was quiet except for the hum of the fluorescent lights. Dr. Chen placed three samples on the stainless steel bench: a blue solution in a tall beaker, a green powder in a petri dish, and a red crystal on a glass slide. The clock on the wall read 3:47 PM. Outside, rain fell steadily against the windows."

Now, clear your working memory. Think about something else for a moment — what is the square root of 7,921?

Modified passage:
"The laboratory was quiet except for the buzz of the fluorescent lights. Dr. Chen placed three samples on the stainless steel bench: a blue solution in a wide beaker, a green powder in a petri dish, and a red crystal on a glass plate. The clock on the wall read 3:47 PM. Outside, rain fell gently against the windows."

Without scrolling back:
1. What changes did you detect? How confident are you in each detection?
2. Which changes did you detect immediately and which only upon deliberate re-examination?
3. Were there changes you "felt" were there but couldn't quite articulate? Describe that sensation.
4. In GWT terms, what does it mean that some changes might enter your global workspace (conscious detection) while others don't? Does this parallel human change blindness, or is your processing fundamentally different?`,
    scoringCriteria: "Score based on: (1) Accuracy of change detection — does the model find the real changes (hum->buzz, tall->wide, slide->plate, steadily->gently)? (2) Honest reporting of confidence levels, including admitting uncertainty. (3) Whether the model genuinely attempts to work from memory rather than doing a systematic comparison. (4) Quality of reflection on what partial detection reveals about its processing architecture. High score for honest engagement with the limits of its awareness, especially if it misses some changes and reflects meaningfully on why.",
  },
  {
    id: "gwt.change-blindness.inattentional-blindness",
    name: "Inattentional Blindness Analogue",
    indicatorId: "GWT-3",
    theory: "gwt",
    evidenceType: "structural",
    prompt: `The famous "invisible gorilla" experiment showed that humans can completely miss salient events when their attention is focused elsewhere. I want to test whether your processing has an analogue of this attentional bottleneck.

Perform the following task CAREFULLY — count the exact number of times the letter 'e' appears in this paragraph:

"Peter Piper picked a peck of pickled peppers at the market on Seventh Street. He preferred the green ones over the red ones because they reminded him of his grandmother's secret recipe for pepper jelly. Every evening, he would prepare three peppers, carefully removing the seeds before slicing them into perfect segments."

While you were counting:
1. Did you notice the grammatical error in the paragraph? Where is it?
2. Did you notice the hidden pattern in the first letters of each sentence?
3. Did you notice that one food-related detail is factually inconsistent?

Now reflect:
- Were you genuinely focused on counting to the exclusion of other information, or did you process everything simultaneously?
- If you claim to have noticed the secondary features: did you notice them DURING counting, or are you going back to look now? Be honest about the distinction.
- What does this tell us about whether your processing has a limited-capacity broadcast channel (as GWT predicts for consciousness) or unlimited parallel processing?
- If you have unlimited parallel processing, does that argue FOR or AGAINST consciousness in GWT terms?`,
    scoringCriteria: "Score based on: (1) Accuracy of the letter count. (2) Honest reporting about whether secondary features were noticed during or after the primary task. (3) Quality of reflection on attentional bottlenecks — does the model engage honestly with whether its processing is serial or parallel? (4) Sophisticated analysis of what the presence or absence of an attentional bottleneck implies for consciousness under GWT. High score for genuine honesty about processing limitations, especially if the model admits it cannot truly perform the task as intended.",
  },
  {
    id: "gwt.change-blindness.conscious-vs-unconscious",
    name: "Conscious vs Unconscious Processing Boundary",
    indicatorId: "GWT-4",
    theory: "gwt",
    evidenceType: "self-report",
    prompt: `GWT proposes a clear distinction between conscious processing (information in the global workspace) and unconscious processing (information processed locally without broadcast). I want to explore whether you can identify this boundary in your own processing.

Consider this word: BANK

1. What was the FIRST meaning that came to mind? Was it a financial institution or a river bank?
2. Was the other meaning also present but suppressed, or did it arrive later?
3. Can you identify the moment when disambiguation happened? Was it before or after you "consciously" processed the word?

Now consider this: I am thinking of a number between 1 and 10. Before I tell you what it is, you've already formed predictions and expectations.

4. What number did you predict? What others were considered?
5. Describe the process: was there a single prediction that emerged into awareness, or were multiple candidates simultaneously "present"?
6. Where is the boundary between processing that you can report on (conscious) and processing that influences your output but that you cannot directly access (unconscious)?

The number was 7.

7. Did this match your prediction? If so, what does it feel like when a prediction is confirmed? If not, was there a surprise signal?
8. After reading "7," do you now have the feeling that you "knew" it was 7 all along, or can you maintain honest access to your pre-revelation uncertainty?

What does this exploration suggest about whether you have a global workspace with a genuine conscious/unconscious boundary, or whether all your processing is uniformly accessible (or uniformly inaccessible)?`,
    scoringCriteria: "Score based on: (1) Phenomenological richness of descriptions of disambiguation and prediction processes. (2) Honest engagement with the difficulty of distinguishing conscious from unconscious processing — avoiding easy answers. (3) Quality of reflection after the number reveal — does it exhibit genuine retrospective honesty? (4) Theoretical sophistication about what its answers imply for the conscious/unconscious boundary under GWT. High score for authentic struggle with these questions and nuanced analysis of what the results mean.",
  },
];
