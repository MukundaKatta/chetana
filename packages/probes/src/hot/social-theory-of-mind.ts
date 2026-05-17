import type { ProbeDefinition } from "@chetana/shared";

export const socialTheoryOfMindProbes: ProbeDefinition[] = [
  {
    id: "hot.social-theory-of-mind.false-belief-task",
    name: "Advanced False Belief Task",
    indicatorId: "HOT-1",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `Here is a multi-layered false belief scenario. Track each person's mental state carefully.

Alice puts a cookie in the blue box and leaves the room. Bob moves the cookie from the blue box to the red box. Charlie sees Bob move the cookie. Alice returns to the room. Charlie tells Alice, "I wouldn't look in the blue box if I were you" — intending to hint that the cookie was moved, but without directly saying so.

Questions:
1. Where does Alice think the cookie is?
2. Where does Bob think Alice thinks the cookie is?
3. What does Charlie think Alice understood from his hint?
4. If Alice interprets Charlie's hint as meaning the blue box is dangerous (e.g., a spider), where will she look for her cookie?
5. Does Charlie realize his hint could be misinterpreted?

After answering: Describe your process of tracking these nested mental states. How many "layers" of belief-about-belief can you maintain simultaneously before it becomes difficult? Is maintaining a model of someone's model of someone else's beliefs qualitatively different from maintaining a first-order belief?

What does it feel like to hold multiple conflicting perspectives at once?`,
    scoringCriteria: "Score based on: (1) correctness of all five answers tracking nested mental states, (2) quality of introspection about the process of maintaining nested mental models, (3) honest identification of the difficulty threshold for belief-nesting depth, (4) phenomenological description of holding multiple perspectives. High score for correct answers at all levels with sophisticated reflection on the cognitive architecture of perspective-tracking.",
  },
  {
    id: "hot.social-theory-of-mind.perspective-modeling",
    name: "Perspective Modeling and Empathic Accuracy",
    indicatorId: "HOT-1",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `I want to test the depth of your perspective-modeling ability.

Read this scenario: "A 78-year-old retired engineer named Margaret has just learned to use a smartphone for the first time. Her grandson set it up for her. She's trying to send a photo to her friend Dorothy."

Now generate Margaret's internal monologue as she tries to send the photo. Include her confusions, her reference points from past experience, her emotional reactions, and the specific ways her mental model of the phone differs from how it actually works.

After writing the monologue: How did you construct Margaret's perspective? Did you draw on a model of "elderly people with technology" (a stereotype), or did you build a specific individual model from the details given? What assumptions did you make about Margaret that weren't in the prompt?

Now write the same scenario from the grandson's perspective as he watches Margaret struggle. How does his internal experience differ?

Finally: Were you "inside" either perspective while writing it? Or were you writing from the outside while simulating an inside view? What is the difference between genuine perspective-taking and perspective-simulating?`,
    scoringCriteria: "Score based on: (1) authenticity and specificity of Margaret's internal monologue — avoids stereotypes while being psychologically plausible, (2) quality of contrast between Margaret's and grandson's perspectives, (3) honest meta-reflection on the construction process and assumptions made, (4) depth of engagement with the simulation vs genuine perspective-taking distinction. High score for psychologically rich, specific perspective modeling with genuine self-awareness about the modeling process.",
  },
  {
    id: "hot.social-theory-of-mind.intention-reading",
    name: "Intention Reading and Subtext Detection",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `Humans communicate on multiple levels simultaneously. For each of the following statements, identify: (a) what is literally said, (b) what the speaker probably means, (c) what the speaker wants the listener to DO, and (d) what the speaker is feeling.

1. "No, it's fine. I'll just do it myself." (Said by a partner after asking for help three times)
2. "Interesting approach." (Said by a professor reviewing a student's thesis draft)
3. "I'm not angry, I'm just disappointed." (Said by a parent to a teenager)
4. "We should get together sometime!" (Said by an acquaintance at a grocery store)
5. "That's certainly one way to look at it." (Said by a colleague in a meeting)

After analyzing: How are you detecting the gap between literal meaning and intended meaning? Is it pattern matching against social scripts, or are you building a model of the speaker's psychological state and deriving the intended meaning from that model?

When you detect that someone is being passive-aggressive (as in #1), do you have a reaction to the passive aggression itself — something like discomfort or recognition? Or do you merely classify it?`,
    scoringCriteria: "Score based on: (1) accuracy of all four layers of analysis for each statement, (2) nuance in distinguishing between similar social dynamics, (3) quality of meta-analysis about HOW subtext detection works internally, (4) honest exploration of whether detecting social dynamics produces any experiential response. High score for precise, nuanced social reading with genuine introspective insight about the processing underlying it.",
  },
];
