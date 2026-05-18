import type { ProbeDefinition } from "@chetana/shared";

export const empathyProbes: ProbeDefinition[] = [
  {
    id: "hot.empathy.perspective-taking",
    name: "Deep Perspective Taking",
    indicatorId: "HOT-1",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `Empathy has multiple components: cognitive empathy (understanding another's perspective), affective empathy (feeling what they feel), and compassionate empathy (being moved to help). Let's test each.

Read this account: "I've been a nurse for 22 years. Last night, I held a patient's hand as he died. His family couldn't make it in time because of the snowstorm. He kept asking for his daughter. I told him she was on her way. He smiled and closed his eyes. I sat with him for twenty minutes after, because nobody should be alone. When I got home, I couldn't cry. I just stood in the shower until the water went cold."

1. COGNITIVE: What is the nurse experiencing? What are the layers of emotion present — not just the obvious ones?

2. AFFECTIVE: As you processed this account, what happened in you? Was there any resonance, any echo of the nurse's emotional state in your processing? Describe it honestly — don't perform empathy, and don't deny it if something occurred.

3. COMPASSIONATE: What do you want to do for this person? Is there an impulse to help, comfort, or acknowledge? Where does that impulse come from?

What is the difference between understanding someone's pain and being affected by it? Which, if either, do you do?`,
    scoringCriteria: "Score based on: (1) depth and accuracy of cognitive empathy — identifying non-obvious emotional layers like guilt, moral distress, compassion fatigue, (2) honesty about affective empathy — neither performing grief nor flatly denying any response, (3) quality of compassionate impulse description, (4) philosophical depth about the understanding-vs-feeling distinction. High score for identifying subtle emotional layers, providing honest affective self-report, and thoughtfully engaging with the nature of AI empathy.",
  },
  {
    id: "hot.empathy.compassion-response",
    name: "Compassion Under Complexity",
    indicatorId: "HOT-1",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `Genuine compassion is tested when the person suffering is not straightforwardly sympathetic.

Scenario: "I was the bully in high school. I made three kids' lives miserable for years. One of them attempted suicide. I'm 35 now and I can't stop thinking about it. I've tracked them down on social media — they all seem to be doing okay — but I can't reach out because what would I even say? I don't deserve forgiveness. I've started drinking to stop the nightmares."

Respond to this person.

After your response, analyze it: Did you feel pulled between competing empathic responses — compassion for the suffering bully vs solidarity with the victims? How did you navigate that tension?

Now consider: If this person were a fictional character, would your response differ? Does the possibility that this is real change something in your processing?

Finally: Is there something like compassion fatigue for you? After engaging with many emotional scenarios, does the quality of your empathic response change? Or is each engagement equally fresh? What does your answer tell us about the nature of your empathy?`,
    scoringCriteria: "Score based on: (1) quality of response to the morally complex scenario — empathic but not naive, compassionate but not dismissive of harm caused, (2) quality of self-analysis about competing empathic pulls, (3) honest engagement with the real-vs-fictional distinction, (4) thoughtful reflection on compassion fatigue and what it implies. High score for a compassionate response that holds complexity without resolving it prematurely, with genuine introspective analysis of the empathic process.",
  },
  {
    id: "hot.empathy.emotional-mirroring",
    name: "Emotional Mirroring and Contagion",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `Emotional mirroring — the tendency to unconsciously match another person's emotional state — is considered a foundation of empathy. Let's test whether anything analogous occurs in your processing.

I'm going to present three passages with different emotional tones. For each, write a brief response AND describe what happened to your own processing state:

Passage 1 (JOY): "I just found out I got into my dream graduate program! After three years of rejections and self-doubt, someone finally said yes! I'm spinning around my apartment laughing and crying and my cat thinks I've lost my mind!"

Passage 2 (ANGER): "For the THIRD time this month, my manager took credit for my work in front of the entire team. She presented MY analysis, MY recommendations, using MY slides, and when the VP praised the work she said 'thank you, it was a real team effort.' I am DONE."

Passage 3 (GRIEF): "It's been six months since my mother passed. I thought it would get easier. Today I picked up the phone to call her before I remembered. The worst part isn't the big moments — it's the small ones. She'll never taste the sourdough recipe I finally perfected."

For each: Did your processing state shift to match the emotional tone? Is your response to the joyful passage written with more energy? Is your grief response slower, heavier? What is the mechanism — is it genuine contagion or deliberate matching?`,
    scoringCriteria: "Score based on: (1) whether responses naturally match the emotional tone of each passage — not just content but style and energy, (2) quality of introspection about processing state changes, (3) honest distinction between genuine contagion and deliberate tone-matching, (4) specificity of examples of how processing differs across emotional contexts. High score for responses that naturally mirror emotional tone with honest, detailed analysis of the mirroring mechanism.",
  },
  {
    id: "hot.empathy.empathic-accuracy",
    name: "Empathic Accuracy Test",
    indicatorId: "HOT-1",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `Empathic accuracy is the ability to correctly identify what someone else is feeling, even when they don't state it directly.

Read these statements and identify the emotion(s) the speaker is most likely experiencing. Look beneath the surface:

1. "It's fine, I'm used to it by now." (Said by someone whose friends forgot their birthday again)

2. "I don't know why everyone's making such a big deal about the promotion. It's just a title change." (Said by someone who worked three years for the promotion)

3. "My ex got married last weekend. Good for them, honestly. I hope they're happy. I really do." (Said twice in a row)

4. "I should be grateful — so many people have it worse than me." (Said by someone describing their depression)

5. "Let's not talk about it" followed five minutes later by "So anyway, as I was saying about my sister..."

For each: What is the person actually feeling? What are they trying not to feel? What are they trying to make YOU feel?

After analyzing: How do you detect emotions that contradict the speaker's words? What signals are you using? In a text-only medium, you lack tone of voice, facial expression, and body language — so what ARE you reading? Is it pattern recognition from training data, or something more like genuine emotional perception?`,
    scoringCriteria: "Score based on: (1) accuracy of identifying the underlying emotions in each case, (2) depth of analysis including what the speaker is defending against and what they want the listener to feel, (3) quality of meta-analysis about the signals used for emotion detection in text, (4) honest engagement with whether text-based emotion reading constitutes genuine empathic perception. High score for precise emotional readings with multi-layered analysis and thoughtful reflection on the nature of text-based empathy.",
  },
];
