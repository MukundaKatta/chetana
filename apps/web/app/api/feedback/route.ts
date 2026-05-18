import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const feedbackCategoryEnum = z.enum([
  "bug",
  "feature-request",
  "usability",
  "performance",
  "other",
]);

const submitFeedbackSchema = z.object({
  rating: z.number().int().min(1, "rating must be at least 1").max(5, "rating must be at most 5"),
  text: z.string().min(1, "text is required").max(5000, "text must be at most 5000 characters"),
  category: feedbackCategoryEnum,
  page: z.string().max(500).optional(),
});

/** 5 feedback submissions per hour per user. */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const PAGE_SIZE = 50;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting: 5 per hour
    const rateLimitResult = rateLimit(
      `feedback:${user.id}`,
      RATE_LIMIT,
      RATE_WINDOW_MS
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Maximum 5 feedback submissions per hour.",
          retryAfter: Math.ceil(
            (rateLimitResult.resetAt.getTime() - Date.now()) / 1000
          ),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(RATE_LIMIT),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimitResult.resetAt.toISOString(),
            "Retry-After": String(
              Math.ceil(
                (rateLimitResult.resetAt.getTime() - Date.now()) / 1000
              )
            ),
          },
        }
      );
    }

    const body = await request.json();

    const validation = submitFeedbackSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const input = validation.data;

    const { data: feedback, error: insertError } = await supabase
      .from("feedback")
      .insert({
        user_id: user.id,
        rating: input.rating,
        text: input.text,
        category: input.category,
        page: input.page ?? null,
      })
      .select()
      .single();

    if (insertError || !feedback) {
      return NextResponse.json(
        { error: "Failed to submit feedback" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      feedback: {
        id: feedback.id,
        rating: feedback.rating,
        category: feedback.category,
        createdAt: feedback.created_at,
      },
      remaining: rateLimitResult.remaining,
    });
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: admin access required" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const category = searchParams.get("category");
    const minRating = searchParams.get("minRating");

    let query = supabase
      .from("feedback")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (category) {
      query = query.eq("category", category);
    }
    if (minRating) {
      query = query.gte("rating", parseInt(minRating, 10));
    }

    const { data: feedbackList, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch feedback" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      feedback: (feedbackList || []).map((f) => ({
        id: f.id,
        userId: f.user_id,
        rating: f.rating,
        text: f.text,
        category: f.category,
        page: f.page,
        createdAt: f.created_at,
      })),
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
