import { NextRequest, NextResponse } from "next/server";

const API_VERSION = "1.0.0";
const API_DEPRECATED_VERSIONS: Record<string, string> = {};

const AVAILABLE_ENDPOINTS = [
  { path: "/api/v1/audit/run", method: "POST", description: "Run a new audit" },
  { path: "/api/v1/audits", method: "GET", description: "List user audits" },
  { path: "/api/v1/audit/batch", method: "POST", description: "Run batch audits" },
  { path: "/api/v1/audit/compare", method: "GET", description: "Compare audits" },
  { path: "/api/v1/audit/schedule", method: "GET/POST/DELETE", description: "Manage audit schedules" },
  { path: "/api/v1/audit/reproduce", method: "POST", description: "Reproduce an audit" },
  { path: "/api/v1/audit/consensus", method: "POST", description: "Cross-model consensus" },
  { path: "/api/v1/leaderboard", method: "GET", description: "Model leaderboard" },
  { path: "/api/v1/models/availability", method: "GET", description: "Model availability" },
  { path: "/api/v1/probes/suggest", method: "GET", description: "Probe suggestions" },
  { path: "/api/v1/user/preferences", method: "GET/PUT", description: "User preferences" },
  { path: "/api/v1/health/dashboard", method: "GET", description: "Health dashboard" },
  { path: "/api/v1/webhooks/config", method: "GET/PUT", description: "Webhook config" },
  { path: "/api/v1/data/retention", method: "GET/PUT/POST", description: "Data retention" },
  { path: "/api/v1/graphql", method: "POST", description: "GraphQL endpoint" },
];

// Maps v1 paths to current API paths
const VERSION_ROUTE_MAP: Record<string, string> = {
  "audit/run": "/api/audit/run",
  "audits": "/api/audits",
  "audit/batch": "/api/audit/batch",
  "audit/compare": "/api/audit/compare",
  "audit/schedule": "/api/audit/schedule",
  "audit/reproduce": "/api/audit/reproduce",
  "audit/consensus": "/api/audit/consensus",
  "leaderboard": "/api/leaderboard",
  "models/availability": "/api/models/availability",
  "probes/suggest": "/api/probes/suggest",
  "user/preferences": "/api/user/preferences",
  "health/dashboard": "/api/health/dashboard",
  "webhooks/config": "/api/webhooks/config",
  "data/retention": "/api/data/retention",
  "graphql": "/api/graphql",
};

export async function GET(request: NextRequest) {
  const requestedVersion = request.headers.get("X-API-Version");

  // If a specific version is requested, check for deprecation
  const deprecationNotice = requestedVersion
    ? API_DEPRECATED_VERSIONS[requestedVersion] ?? null
    : null;

  const response = NextResponse.json({
    version: API_VERSION,
    status: "stable",
    deprecationNotice,
    endpoints: AVAILABLE_ENDPOINTS,
    routeMap: VERSION_ROUTE_MAP,
    documentation: "/api/docs",
  });

  response.headers.set("X-API-Version", API_VERSION);

  if (deprecationNotice) {
    response.headers.set("X-API-Deprecated", "true");
    response.headers.set("X-API-Deprecation-Notice", deprecationNotice);
  }

  return response;
}

export async function POST(request: NextRequest) {
  return handleVersionedRequest(request);
}

export async function PUT(request: NextRequest) {
  return handleVersionedRequest(request);
}

export async function DELETE(request: NextRequest) {
  return handleVersionedRequest(request);
}

async function handleVersionedRequest(request: NextRequest) {
  const url = new URL(request.url);
  // Extract the sub-path after /api/v1/
  const subPath = url.pathname.replace(/^\/api\/v1\/?/, "");

  if (!subPath) {
    const response = NextResponse.json({
      version: API_VERSION,
      message: "Use GET /api/v1 to see available endpoints",
    });
    response.headers.set("X-API-Version", API_VERSION);
    return response;
  }

  const targetPath = VERSION_ROUTE_MAP[subPath];
  if (!targetPath) {
    const response = NextResponse.json(
      { error: `Unknown v1 endpoint: ${subPath}` },
      { status: 404 }
    );
    response.headers.set("X-API-Version", API_VERSION);
    return response;
  }

  // Build the internal redirect URL
  const targetUrl = new URL(targetPath, url.origin);
  targetUrl.search = url.search;

  const response = NextResponse.json(
    {
      message: "Route to the target endpoint directly",
      targetPath,
      version: API_VERSION,
    },
    { status: 308 }
  );
  response.headers.set("X-API-Version", API_VERSION);
  response.headers.set("Location", targetUrl.toString());

  return response;
}
