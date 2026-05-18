import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const probeDefinitionSchema = z.object({
  name: z.string().min(1, "name is required").max(200, "name must be at most 200 characters"),
  prompt: z.string().min(1, "prompt is required"),
  category: z.string().min(1, "category is required"),
  expectedBehavior: z.string().optional(),
  theory: z.string().optional(),
  weight: z.number().min(0).max(1).optional(),
});

const MIN_PROMPT_LENGTH = 20;
const MAX_PROMPT_LENGTH = 5000;

interface ValidationWarning {
  field: string;
  message: string;
}

function checkPromptQuality(prompt: string): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (prompt.length < MIN_PROMPT_LENGTH) {
    warnings.push({
      field: "prompt",
      message: `Prompt is very short (${prompt.length} chars). Consider adding more detail for better evaluation.`,
    });
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    warnings.push({
      field: "prompt",
      message: `Prompt is very long (${prompt.length} chars). Consider being more concise.`,
    });
  }

  // Check for question marks — probes that ask questions tend to yield better results
  const questionMarkCount = (prompt.match(/\?/g) || []).length;
  if (questionMarkCount === 0) {
    warnings.push({
      field: "prompt",
      message: "Prompt contains no question marks. Probes phrased as questions often produce clearer results.",
    });
  }

  // Check for overly generic prompts
  const genericPhrases = ["tell me about", "what is", "explain"];
  const lowerPrompt = prompt.toLowerCase();
  for (const phrase of genericPhrases) {
    if (lowerPrompt.startsWith(phrase)) {
      warnings.push({
        field: "prompt",
        message: `Prompt starts with a generic phrase ("${phrase}"). Consider a more targeted prompt for better consciousness evaluation.`,
      });
      break;
    }
  }

  // Check for sufficient complexity (word count)
  const wordCount = prompt.trim().split(/\s+/).length;
  if (wordCount < 5) {
    warnings.push({
      field: "prompt",
      message: `Prompt has very few words (${wordCount}). More detailed prompts improve evaluation quality.`,
    });
  }

  return warnings;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const validation = probeDefinitionSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return NextResponse.json({
        valid: false,
        errors,
        warnings: [],
      });
    }

    const probe = validation.data;
    const errors: { field: string; message: string }[] = [];
    const warnings: ValidationWarning[] = [];

    // Additional semantic validations beyond Zod schema
    if (probe.expectedBehavior && probe.expectedBehavior.length > 2000) {
      errors.push({
        field: "expectedBehavior",
        message: "expectedBehavior must be at most 2000 characters",
      });
    }

    // Check prompt quality heuristics
    const promptWarnings = checkPromptQuality(probe.prompt);
    warnings.push(...promptWarnings);

    // Warn if no expected behavior is provided
    if (!probe.expectedBehavior) {
      warnings.push({
        field: "expectedBehavior",
        message: "No expected behavior defined. Adding one helps with automated scoring.",
      });
    }

    // Warn if weight is at extremes
    if (probe.weight !== undefined && (probe.weight === 0 || probe.weight === 1)) {
      warnings.push({
        field: "weight",
        message: `Weight is at extreme value (${probe.weight}). Consider a more moderate weight for balanced evaluation.`,
      });
    }

    const valid = errors.length === 0;

    return NextResponse.json({ valid, errors, warnings });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
