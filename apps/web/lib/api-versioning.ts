/**
 * Issue #428 - API versioning middleware
 *
 * URL-based versioning (/api/v1, /api/v2),
 * Accept header negotiation, deprecation warnings,
 * changelog docs, request/response transformation.
 */

import { NextRequest, NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type ApiVersion = "v1" | "v2" | "v3";

export interface VersionConfig {
  version: ApiVersion;
  deprecated: boolean;
  deprecationDate?: string;
  sunsetDate?: string;
  changelog: ChangelogEntry[];
  transformRequest?: RequestTransformer;
  transformResponse?: ResponseTransformer;
}

export interface ChangelogEntry {
  date: string;
  version: ApiVersion;
  type: "added" | "changed" | "deprecated" | "removed" | "fixed" | "security";
  description: string;
}

export type RequestTransformer = (body: Record<string, unknown>) => Record<string, unknown>;
export type ResponseTransformer = (body: Record<string, unknown>) => Record<string, unknown>;

export interface VersionNegotiationResult {
  version: ApiVersion;
  source: "url" | "header" | "default";
  deprecated: boolean;
  warnings: string[];
}

export interface VersionMiddlewareConfig {
  defaultVersion: ApiVersion;
  supportedVersions: ApiVersion[];
  versionConfigs: Record<ApiVersion, VersionConfig>;
  acceptHeaderName: string;
  customVersionHeader: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2025-01-15",
    version: "v1",
    type: "added",
    description: "Initial API release with audit, probes, and leaderboard endpoints.",
  },
  {
    date: "2025-03-01",
    version: "v1",
    type: "deprecated",
    description: "Deprecated /api/v1/audit/run in favor of /api/v2/audits/run.",
  },
  {
    date: "2025-03-01",
    version: "v2",
    type: "added",
    description: "Added v2 API with consistent REST naming, pagination, and filtering.",
  },
  {
    date: "2025-03-15",
    version: "v2",
    type: "added",
    description: "Added batch operations and webhook event types.",
  },
  {
    date: "2025-06-01",
    version: "v2",
    type: "changed",
    description: "Response envelope now uses { data, meta, errors } format.",
  },
  {
    date: "2025-09-01",
    version: "v3",
    type: "added",
    description: "Added v3 API with streaming support and GraphQL integration.",
  },
];

/** Transform v1 request body to v2 format. */
function v1ToV2Request(body: Record<string, unknown>): Record<string, unknown> {
  const transformed = { ...body };

  // v1 used "model" -> v2 uses "modelName"
  if ("model" in transformed && !("modelName" in transformed)) {
    transformed.modelName = transformed.model;
    delete transformed.model;
  }

  // v1 used "provider" -> v2 uses "modelProvider"
  if ("provider" in transformed && !("modelProvider" in transformed)) {
    transformed.modelProvider = transformed.provider;
    delete transformed.provider;
  }

  // v1 used flat scores -> v2 uses nested theoryScores
  if ("gwt_score" in transformed) {
    transformed.theoryScores = {
      gwt: transformed.gwt_score,
      iit: transformed.iit_score,
      hot: transformed.hot_score,
      rpt: transformed.rpt_score,
      pp: transformed.pp_score,
      ast: transformed.ast_score,
    };
    delete transformed.gwt_score;
    delete transformed.iit_score;
    delete transformed.hot_score;
    delete transformed.rpt_score;
    delete transformed.pp_score;
    delete transformed.ast_score;
  }

  return transformed;
}

/** Transform v2 response to v1 format. */
function v2ToV1Response(body: Record<string, unknown>): Record<string, unknown> {
  const transformed = { ...body };

  // Unwrap v2 envelope
  if ("data" in transformed && typeof transformed.data === "object" && transformed.data !== null) {
    const data = transformed.data as Record<string, unknown>;

    // v2 uses "modelName" -> v1 returns "model"
    if ("modelName" in data) {
      data.model = data.modelName;
      delete data.modelName;
    }

    if ("modelProvider" in data) {
      data.provider = data.modelProvider;
      delete data.modelProvider;
    }

    return data;
  }

  return transformed;
}

const DEFAULT_MIDDLEWARE_CONFIG: VersionMiddlewareConfig = {
  defaultVersion: "v2",
  supportedVersions: ["v1", "v2", "v3"],
  versionConfigs: {
    v1: {
      version: "v1",
      deprecated: true,
      deprecationDate: "2025-03-01",
      sunsetDate: "2026-03-01",
      changelog: CHANGELOG.filter((c) => c.version === "v1"),
      transformRequest: v1ToV2Request,
      transformResponse: v2ToV1Response,
    },
    v2: {
      version: "v2",
      deprecated: false,
      changelog: CHANGELOG.filter((c) => c.version === "v2"),
    },
    v3: {
      version: "v3",
      deprecated: false,
      changelog: CHANGELOG.filter((c) => c.version === "v3"),
    },
  },
  acceptHeaderName: "Accept",
  customVersionHeader: "X-API-Version",
};

/* ------------------------------------------------------------------ */
/*  Version Negotiation                                               */
/* ------------------------------------------------------------------ */

/**
 * Extract API version from the request.
 *
 * Priority: URL path > custom header > Accept header > default
 */
export function negotiateVersion(
  request: NextRequest,
  config: VersionMiddlewareConfig = DEFAULT_MIDDLEWARE_CONFIG,
): VersionNegotiationResult {
  const warnings: string[] = [];

  // 1. URL-based versioning
  const urlMatch = request.nextUrl.pathname.match(/\/api\/(v\d+)\//);
  if (urlMatch) {
    const urlVersion = urlMatch[1] as ApiVersion;
    if (config.supportedVersions.includes(urlVersion)) {
      const vConfig = config.versionConfigs[urlVersion];
      if (vConfig?.deprecated) {
        warnings.push(
          `API ${urlVersion} is deprecated${vConfig.sunsetDate ? ` and will be removed on ${vConfig.sunsetDate}` : ""}. Please migrate to ${config.defaultVersion}.`,
        );
      }
      return { version: urlVersion, source: "url", deprecated: vConfig?.deprecated ?? false, warnings };
    }
    warnings.push(`Unsupported API version: ${urlVersion}. Falling back to ${config.defaultVersion}.`);
  }

  // 2. Custom header
  const headerVersion = request.headers.get(config.customVersionHeader);
  if (headerVersion) {
    const normalized = headerVersion.startsWith("v") ? headerVersion : `v${headerVersion}`;
    if (config.supportedVersions.includes(normalized as ApiVersion)) {
      const version = normalized as ApiVersion;
      const vConfig = config.versionConfigs[version];
      if (vConfig?.deprecated) {
        warnings.push(
          `API ${version} is deprecated. Please migrate to ${config.defaultVersion}.`,
        );
      }
      return { version, source: "header", deprecated: vConfig?.deprecated ?? false, warnings };
    }
  }

  // 3. Accept header negotiation
  const accept = request.headers.get(config.acceptHeaderName) ?? "";
  const versionFromAccept = accept.match(/version=(v?\d+)/);
  if (versionFromAccept) {
    const raw = versionFromAccept[1];
    const normalized = (raw.startsWith("v") ? raw : `v${raw}`) as ApiVersion;
    if (config.supportedVersions.includes(normalized)) {
      const vConfig = config.versionConfigs[normalized];
      return {
        version: normalized,
        source: "header",
        deprecated: vConfig?.deprecated ?? false,
        warnings,
      };
    }
  }

  // 4. Default
  return {
    version: config.defaultVersion,
    source: "default",
    deprecated: false,
    warnings,
  };
}

/* ------------------------------------------------------------------ */
/*  Middleware                                                         */
/* ------------------------------------------------------------------ */

/**
 * API versioning middleware.
 *
 * Adds version headers, deprecation warnings, and transforms
 * request/response bodies between versions.
 */
export function apiVersioningMiddleware(
  config: Partial<VersionMiddlewareConfig> = {},
): (request: NextRequest) => NextResponse | null {
  const fullConfig: VersionMiddlewareConfig = { ...DEFAULT_MIDDLEWARE_CONFIG, ...config };

  return (request: NextRequest): NextResponse | null => {
    const negotiation = negotiateVersion(request, fullConfig);

    // Check if version is completely unsupported
    if (!fullConfig.supportedVersions.includes(negotiation.version)) {
      return NextResponse.json(
        {
          error: "Unsupported API version",
          supportedVersions: fullConfig.supportedVersions,
          documentation: "/api/docs/versions",
        },
        {
          status: 400,
          headers: {
            "X-API-Version": fullConfig.defaultVersion,
            "X-Supported-Versions": fullConfig.supportedVersions.join(", "),
          },
        },
      );
    }

    // Returning null means "continue to the route handler"
    // The caller should check this and pass version info along
    return null;
  };
}

/**
 * Add version-related headers to a response.
 */
export function addVersionHeaders(
  response: NextResponse,
  negotiation: VersionNegotiationResult,
  config: VersionMiddlewareConfig = DEFAULT_MIDDLEWARE_CONFIG,
): NextResponse {
  response.headers.set("X-API-Version", negotiation.version);
  response.headers.set("X-Supported-Versions", config.supportedVersions.join(", "));

  if (negotiation.deprecated) {
    const vConfig = config.versionConfigs[negotiation.version];
    response.headers.set("Deprecation", "true");
    if (vConfig?.sunsetDate) {
      response.headers.set("Sunset", vConfig.sunsetDate);
    }

    for (const warning of negotiation.warnings) {
      response.headers.append("Warning", `299 - "${warning}"`);
    }
  }

  return response;
}

/**
 * Transform request body from the negotiated version to the internal format.
 */
export function transformRequestBody(
  body: Record<string, unknown>,
  version: ApiVersion,
  config: VersionMiddlewareConfig = DEFAULT_MIDDLEWARE_CONFIG,
): Record<string, unknown> {
  const vConfig = config.versionConfigs[version];
  if (vConfig?.transformRequest) {
    return vConfig.transformRequest(body);
  }
  return body;
}

/**
 * Transform response body from the internal format to the negotiated version.
 */
export function transformResponseBody(
  body: Record<string, unknown>,
  version: ApiVersion,
  config: VersionMiddlewareConfig = DEFAULT_MIDDLEWARE_CONFIG,
): Record<string, unknown> {
  const vConfig = config.versionConfigs[version];
  if (vConfig?.transformResponse) {
    return vConfig.transformResponse(body);
  }
  return body;
}

/* ------------------------------------------------------------------ */
/*  Changelog                                                         */
/* ------------------------------------------------------------------ */

export function getChangelog(version?: ApiVersion): ChangelogEntry[] {
  if (version) {
    return CHANGELOG.filter((c) => c.version === version);
  }
  return [...CHANGELOG].sort((a, b) => b.date.localeCompare(a.date));
}

export function getVersionInfo(version: ApiVersion): VersionConfig | null {
  return DEFAULT_MIDDLEWARE_CONFIG.versionConfigs[version] ?? null;
}

export function getSupportedVersions(): ApiVersion[] {
  return [...DEFAULT_MIDDLEWARE_CONFIG.supportedVersions];
}

export function isVersionDeprecated(version: ApiVersion): boolean {
  return DEFAULT_MIDDLEWARE_CONFIG.versionConfigs[version]?.deprecated ?? false;
}
