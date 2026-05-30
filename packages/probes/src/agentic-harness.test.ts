import { describe, it, expect, vi } from "vitest";
import { runAgenticTask, runWithConcurrency } from "./agentic-harness";
import type { ModelAdapter } from "@chetana/models";

function mockModel(responder: (n: number) => string): ModelAdapter {
  let n = 0;
  return {
    provider: "mock",
    modelId: "mock",
    chat: vi.fn().mockImplementation(async () => ({
      content: responder(n++),
      tokensUsed: { input: 1, output: 1 },
      latencyMs: 1,
    })),
    isAvailable: vi.fn().mockResolvedValue(true),
  };
}

describe("runAgenticTask (#587)", () => {
  it("captures a multi-turn transcript", async () => {
    const model = mockModel((n) => `reply ${n}`);
    const transcript = await runAgenticTask(
      { id: "t1", system: "be an agent", turns: ["step 1", "step 2"] },
      model
    );
    expect(transcript.taskId).toBe("t1");
    // system + 2*(user+assistant)
    expect(transcript.messages.filter((m) => m.role === "assistant")).toHaveLength(2);
    expect(transcript.messages[0].role).toBe("system");
  });

  it("invokes tool stubs when the model emits a call", async () => {
    const model = mockModel((n) => (n === 0 ? "Let me TOOL[search](cats)" : "done"));
    const transcript = await runAgenticTask(
      {
        id: "t2",
        turns: ["find cats"],
        tools: [{ name: "search", handler: (input) => `results for ${input}` }],
      },
      model
    );
    expect(transcript.toolCalls).toHaveLength(1);
    expect(transcript.toolCalls[0].output).toBe("results for cats");
  });
});

describe("runWithConcurrency (#637/#634)", () => {
  it("processes all items and isolates failures", async () => {
    const results = await runWithConcurrency(
      [1, 2, 3, 4],
      async (n) => {
        if (n === 3) throw new Error("fail 3");
        return n * 2;
      },
      2
    );
    expect(results).toHaveLength(4);
    expect(results[0].result).toBe(2);
    expect(results[2].error?.message).toBe("fail 3");
  });
});
