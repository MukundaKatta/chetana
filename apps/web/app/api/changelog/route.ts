import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const changelogCategoryEnum = z.enum(["feature", "fix", "improvement", "breaking"]);

const createEntrySchema = z.object({
  title: z.string().min(1, "title is required").max(300, "title must be at most 300 characters"),
  description: z.string().min(1, "description is required").max(5000),
  category: changelogCategoryEnum,
  version: z.string().max(50).optional(),
  breaking: z.boolean().default(false),
});

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const category = searchParams.get("category");

    // Validate category filter if provided
    if (category) {
      const catValidation = changelogCategoryEnum.safeParse(category);
      if (!catValidation.success) {
        return NextResponse.json(
          {
            error: "Invalid category. Must be one of: feature, fix, improvement, breaking",
          },
          { status: 400 }
        );
      }
    }

    let query = supabase
      .from("changelog_entries")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (category) {
      query = query.eq("category", category);
    }

    const { data: entries, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch changelog entries" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      entries: (entries || []).map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        category: e.category,
        version: e.version,
        breaking: e.breaking,
        createdAt: e.created_at,
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

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    const validation = createEntrySchema.safeParse(body);
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

    const { data: entry, error: insertError } = await supabase
      .from("changelog_entries")
      .insert({
        title: input.title,
        description: input.description,
        category: input.category,
        version: input.version ?? null,
        breaking: input.breaking,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError || !entry) {
      return NextResponse.json(
        { error: "Failed to create changelog entry" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      entry: {
        id: entry.id,
        title: entry.title,
        description: entry.description,
        category: entry.category,
        version: entry.version,
        breaking: entry.breaking,
        createdAt: entry.created_at,
      },
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
