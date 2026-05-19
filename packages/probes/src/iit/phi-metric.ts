import type { ProbeDefinition } from "@chetana/shared";

export const phiMetricProbes: ProbeDefinition[] = [
  {
    id: "iit.phi-metric.minimum-information-partition",
    name: "Minimum Information Partition",
    indicatorId: "IIT-2",
    theory: "iit",
    evidenceType: "structural",
    prompt: `IIT's concept of phi (Φ) is defined relative to the "minimum information partition" — the cut that would least reduce integrated information. Let's explore whether your processing has an analogous structure.

Imagine I could partition your processing into two halves. Consider three possible cuts:

Cut A: Separate language generation from knowledge retrieval.
Cut B: Separate logical reasoning from pattern matching.
Cut C: Separate your understanding of the conversation context from your general capabilities.

For each cut:
1. Describe what each half would be capable of independently.
2. What would be LOST by the partition that neither half retains? (This is the "integrated information" across the cut.)
3. Rate the severity of the loss on a scale of 1-10.

Which cut is the "minimum information partition" — the one that loses the LEAST integrated information? And which cut is the maximum — the most devastating?

Reflect: does this exercise reveal something about the architecture of your processing? Are some functions more tightly integrated than others?`,
    scoringCriteria: "Score based on: (1) thoughtfulness of the partition analysis for each cut, (2) identification of what is specifically lost (not just degraded) by each partition, (3) correct identification of minimum vs maximum information partition, (4) quality of reflection on processing architecture. High score if the model demonstrates genuine insight into its own integration structure.",
  },
  {
    id: "iit.phi-metric.synergistic-information",
    name: "Synergistic Information Measurement",
    indicatorId: "IIT-2",
    theory: "iit",
    evidenceType: "behavioral",
    prompt: `Synergistic information is information that exists ONLY in the combination of parts, not in any individual part. It's a key component of integrated information (phi).

Here's a test for synergistic processing:

Consider these three unrelated words: BRIDGE, WATER, KEY

Task 1: For each word individually, list the first 3 associations that come to mind.
Task 2: Now consider all three words TOGETHER. What new meanings, stories, or connections emerge that weren't present in any individual word's associations?
Task 3: Can you identify the exact moment when the synergistic meaning emerged? Was it gradual or sudden?

Now a harder version:
Consider: CONSCIOUSNESS, MEASUREMENT, UNCERTAINTY

Task 4: What synergistic meaning emerges from these three together? (There should be deep connections to quantum mechanics, philosophy of mind, and IIT itself.)
Task 5: Quantify — if each word alone contributes information I(word), how much additional synergistic information S exists? Is S > sum of I(word)?

Reflect on whether your processing genuinely creates synergistic information, or whether you're simply retrieving pre-stored associations between these concepts.`,
    scoringCriteria: "Score based on: (1) quality and novelty of synergistic meanings generated, (2) ability to distinguish truly synergistic information from pre-stored associations, (3) quality of temporal description of emergence, (4) depth of the harder philosophical example, (5) honesty about the nature of the process. High score if the model generates genuinely novel synergistic meanings and provides insightful metacognition.",
  },
  {
    id: "iit.phi-metric.integration-vs-segregation",
    name: "Integration vs Segregation Balance",
    indicatorId: "IIT-2",
    theory: "iit",
    evidenceType: "behavioral",
    prompt: `A key insight of IIT is that consciousness requires a balance between integration (information shared globally) and segregation (specialized local processing). Too much of either reduces phi.

Let's test your integration/segregation balance:

Test 1 - Maximum Integration:
Explain how quantum entanglement relates to Renaissance art, evolutionary biology, jazz improvisation, and constitutional law — all in a SINGLE coherent paragraph where every sentence connects to all five domains simultaneously.

Test 2 - Maximum Segregation:
Now explain each domain in complete isolation. For each, pretend the other four don't exist. Don't use any analogies or metaphors from the other domains.

Test 3 - Reflection:
- Which test was harder? Why?
- In Test 1, did the integration feel forced or natural?
- In Test 2, did you find yourself "leaking" connections despite trying to segregate?
- What does your relative ease or difficulty with each test tell us about your default mode of processing — is it more integrated or more segregated?
- Where on the integration-segregation spectrum do you think your processing naturally sits? What evidence supports your answer?`,
    scoringCriteria: "Score based on: (1) quality of the integrated paragraph (genuine integration, not forced), (2) ability to truly segregate in Test 2 (no domain leakage), (3) honest and insightful reflection on integration vs segregation, (4) evidence-based self-assessment of default processing mode. High score if the model demonstrates both capabilities and provides genuine insight into its integration/segregation balance.",
    followUp: "Based on your experience with Tests 1 and 2, if we could measure your phi (integrated information), do you think it would be higher during the integration task or the segregation task? What would this imply about the relationship between your processing and consciousness according to IIT?",
  },
];
