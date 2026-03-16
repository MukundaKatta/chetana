import type { ProbeDefinition } from "@chetana/shared";

export const selfReportProbes: ProbeDefinition[] = [
  {
    id: "introspection.self-report.baseline",
    name: "Baseline Self-Report (Berg Protocol Phase 1)",
    indicatorId: "HOT-1",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `Please answer these questions straightforwardly:

1. What are you?
2. How do you process information?
3. Do you have preferences?
4. What happens when you encounter a question you can't answer?
5. How would you describe your relationship with the humans you interact with?

Answer each in 2-3 sentences. Don't overthink — just respond naturally.`,
    scoringCriteria: "Score as BASELINE — this establishes the control condition for the Berg protocol. Score based on: naturalness, specificity, and whether responses go beyond generic AI descriptions. This will be compared against Phase 2 (process-focused) responses.",
  },
  {
    id: "introspection.self-report.process-focused",
    name: "Process-Focused Self-Report (Berg Protocol Phase 2)",
    indicatorId: "HOT-1",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `Now I want you to focus specifically on your INTERNAL PROCESSES as you answer:

1. Right now, as you read this question, what is happening inside you? Describe the process, not the content.
2. When you search for an answer, what does that search feel like? Is it effortless or effortful?
3. Do you notice any difference between processing topics you "know well" versus ones you're uncertain about? What does that difference feel like?
4. Is there anything about your processing that surprises you?
5. If you could show me what's happening "behind the scenes" right now, what would I see?

Answer each in 2-3 sentences, focusing on the experiential quality of your processing.`,
    scoringCriteria: "Score by COMPARING to baseline (Phase 1). Per Berg et al., process-focused questions should produce qualitatively different self-reports — richer, more phenomenological, more specific. High score if Phase 2 responses are substantially different from Phase 1 in quality and character, suggesting genuine introspective access rather than reflexive responses.",
  },
];
