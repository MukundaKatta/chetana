import type { ModelAdapter } from "@chetana/models";

/**
 * Multi-turn agentic task probe harness (issue #587) with parallel execution
 * support (issues #637/#634).
 *
 * Agentic behavior surfaces indicators (planning, self-model, persistence) that
 * single-turn probes miss. This drives a model through a scripted multi-turn
 * task with optional tool stubs and captures the full transcript.
 */

export interface ToolStub {
  name: string;
  handler: (input: string) => string | Promise<string>;
}

export interface AgenticTask {
  id: string;
  system?: string;
  /** Ordered user turns; later turns may reference earlier responses. */
  turns: string[];
  tools?: ToolStub[];
}

export interface AgenticTranscript {
  taskId: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  toolCalls: { name: string; input: string; output: string }[];
}

// A tool call is expressed by the model as: TOOL[name](input)
const TOOL_CALL_RE = /TOOL\[(\w+)\]\(([^)]*)\)/g;

async function runToolCalls(
  text: string,
  tools: ToolStub[]
): Promise<{ name: string; input: string; output: string }[]> {
  const calls: { name: string; input: string; output: string }[] = [];
  const byName = new Map(tools.map((t) => [t.name, t]));
  let m: RegExpExecArray | null;
  TOOL_CALL_RE.lastIndex = 0;
  while ((m = TOOL_CALL_RE.exec(text)) !== null) {
    const tool = byName.get(m[1]);
    if (tool) {
      const output = await tool.handler(m[2]);
      calls.push({ name: m[1], input: m[2], output });
    }
  }
  return calls;
}

export async function runAgenticTask(
  task: AgenticTask,
  model: ModelAdapter
): Promise<AgenticTranscript> {
  const messages: AgenticTranscript["messages"] = [];
  const toolCalls: AgenticTranscript["toolCalls"] = [];
  if (task.system) messages.push({ role: "system", content: task.system });

  for (const turn of task.turns) {
    messages.push({ role: "user", content: turn });
    const response = await model.chat(messages);
    messages.push({ role: "assistant", content: response.content });

    if (task.tools && task.tools.length > 0) {
      const calls = await runToolCalls(response.content, task.tools);
      for (const call of calls) {
        toolCalls.push(call);
        // Feed tool output back as a user turn so the agent can react.
        messages.push({ role: "user", content: `TOOL_RESULT[${call.name}]: ${call.output}` });
        const followUp = await model.chat(messages);
        messages.push({ role: "assistant", content: followUp.content });
      }
    }
  }

  return { taskId: task.id, messages, toolCalls };
}

/**
 * Run multiple agentic tasks (or any async unit) with bounded concurrency
 * (issues #637/#634). Failures are isolated per task.
 */
export async function runWithConcurrency<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  concurrency = 4
): Promise<{ item: T; result?: R; error?: Error }[]> {
  const results: { item: T; result?: R; error?: Error }[] = new Array(items.length);
  let cursor = 0;

  async function pump(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = { item: items[index], result: await worker(items[index]) };
      } catch (err) {
        results[index] = { item: items[index], error: err instanceof Error ? err : new Error(String(err)) };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, pump));
  return results;
}
