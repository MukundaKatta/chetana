"use client";

/**
 * Issue #534 - API playground
 *
 * Endpoint browser, request builder, response viewer with syntax
 * highlighting, request history, and code generation.
 */

import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiEndpoint {
  id: string;
  method: HttpMethod;
  path: string;
  description: string;
  category: string;
  parameters?: ApiParameter[];
  requestBody?: {
    contentType: string;
    schema: string; // JSON schema or example
  };
}

export interface ApiParameter {
  name: string;
  in: "query" | "path" | "header";
  type: string;
  required: boolean;
  description?: string;
  defaultValue?: string;
}

export interface RequestHistoryEntry {
  id: string;
  timestamp: string;
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body: string | null;
  status: number | null;
  responseBody: string | null;
  durationMs: number | null;
  error?: string;
}

export interface ApiPlaygroundProps {
  /** Available endpoints. */
  endpoints: ApiEndpoint[];
  /** Base URL for API requests (default "/api"). */
  baseUrl?: string;
  /** Default headers applied to all requests. */
  defaultHeaders?: Record<string, string>;
  /** Max history entries (default 50). */
  maxHistory?: number;
  className?: string;
}

type CodeLanguage = "curl" | "javascript" | "python" | "typescript";
type Tab = "builder" | "response" | "history" | "codegen";

/* ------------------------------------------------------------------ */
/*  Method colors                                                     */
/* ------------------------------------------------------------------ */

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "text-green-500 bg-green-50 dark:bg-green-900/20",
  POST: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
  PUT: "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
  PATCH: "text-orange-500 bg-orange-50 dark:bg-orange-900/20",
  DELETE: "text-red-500 bg-red-50 dark:bg-red-900/20",
};

/* ------------------------------------------------------------------ */
/*  Syntax highlighting (simple token-based)                          */
/* ------------------------------------------------------------------ */

function highlightJson(json: string): string {
  try {
    const formatted = JSON.stringify(JSON.parse(json), null, 2);
    return formatted
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(
        /("(\\u[\da-fA-F]{4}|\\[^u]|[^"\\])*")\s*:/g,
        '<span class="text-purple-400">$1</span>:'
      )
      .replace(
        /("(\\u[\da-fA-F]{4}|\\[^u]|[^"\\])*")/g,
        '<span class="text-green-400">$1</span>'
      )
      .replace(/\b(true|false)\b/g, '<span class="text-yellow-400">$1</span>')
      .replace(/\b(null)\b/g, '<span class="text-gray-400">$1</span>')
      .replace(
        /\b(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g,
        '<span class="text-blue-400">$1</span>'
      );
  } catch {
    return json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

/* ------------------------------------------------------------------ */
/*  Code generation                                                   */
/* ------------------------------------------------------------------ */

function generateCode(
  lang: CodeLanguage,
  method: HttpMethod,
  url: string,
  headers: Record<string, string>,
  body: string | null
): string {
  switch (lang) {
    case "curl": {
      let cmd = `curl -X ${method} '${url}'`;
      for (const [k, v] of Object.entries(headers)) {
        cmd += ` \\\n  -H '${k}: ${v}'`;
      }
      if (body) {
        cmd += ` \\\n  -d '${body}'`;
      }
      return cmd;
    }
    case "javascript":
    case "typescript": {
      const opts: string[] = [`  method: "${method}"`];
      if (Object.keys(headers).length > 0) {
        opts.push(`  headers: ${JSON.stringify(headers, null, 4)}`);
      }
      if (body) {
        opts.push(`  body: JSON.stringify(${body})`);
      }
      return `const response = await fetch("${url}", {\n${opts.join(",\n")}\n});\nconst data = await response.json();\nconsole.log(data);`;
    }
    case "python": {
      let code = "import requests\n\n";
      code += `response = requests.${method.toLowerCase()}(\n    "${url}"`;
      if (Object.keys(headers).length > 0) {
        code += `,\n    headers=${JSON.stringify(headers).replace(/"/g, "'")}`;
      }
      if (body) {
        code += `,\n    json=${body}`;
      }
      code += "\n)\nprint(response.json())";
      return code;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function ApiPlayground({
  endpoints,
  baseUrl = "/api",
  defaultHeaders = { "Content-Type": "application/json" },
  maxHistory = 50,
  className,
}: ApiPlaygroundProps) {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(
    endpoints[0] ?? null
  );
  const [activeTab, setActiveTab] = useState<Tab>("builder");
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [path, setPath] = useState("");
  const [headers, setHeaders] = useState<Record<string, string>>({
    ...defaultHeaders,
  });
  const [body, setBody] = useState("");
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<RequestHistoryEntry[]>([]);
  const [currentResponse, setCurrentResponse] =
    useState<RequestHistoryEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState<CodeLanguage>("curl");
  const [endpointSearch, setEndpointSearch] = useState("");
  const [newHeaderKey, setNewHeaderKey] = useState("");
  const [newHeaderValue, setNewHeaderValue] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // Update form when endpoint is selected
  useEffect(() => {
    if (selectedEndpoint) {
      setMethod(selectedEndpoint.method);
      setPath(selectedEndpoint.path);
      setBody(selectedEndpoint.requestBody?.schema ?? "");
      setParamValues({});
    }
  }, [selectedEndpoint]);

  // Group endpoints by category
  const groupedEndpoints = useMemo(() => {
    const groups = new Map<string, ApiEndpoint[]>();
    const lower = endpointSearch.toLowerCase();
    for (const ep of endpoints) {
      if (
        lower &&
        !ep.path.toLowerCase().includes(lower) &&
        !ep.description.toLowerCase().includes(lower)
      ) {
        continue;
      }
      const list = groups.get(ep.category) ?? [];
      list.push(ep);
      groups.set(ep.category, list);
    }
    return groups;
  }, [endpoints, endpointSearch]);

  // Build the full URL
  const fullUrl = useMemo(() => {
    let resolved = path;
    // Replace path parameters
    for (const [key, val] of Object.entries(paramValues)) {
      resolved = resolved.replace(`{${key}}`, encodeURIComponent(val));
    }
    // Add query parameters
    const queryParams = selectedEndpoint?.parameters?.filter(
      (p) => p.in === "query" && paramValues[p.name]
    );
    if (queryParams && queryParams.length > 0) {
      const qs = queryParams
        .map((p) => `${p.name}=${encodeURIComponent(paramValues[p.name] ?? "")}`)
        .join("&");
      resolved += `?${qs}`;
    }
    return `${baseUrl}${resolved}`;
  }, [path, paramValues, selectedEndpoint, baseUrl]);

  const sendRequest = useCallback(async () => {
    setIsLoading(true);
    setActiveTab("response");
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const startTime = performance.now();
    const entry: RequestHistoryEntry = {
      id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      method,
      url: fullUrl,
      headers: { ...headers },
      body: ["POST", "PUT", "PATCH"].includes(method) && body ? body : null,
      status: null,
      responseBody: null,
      durationMs: null,
    };

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: { ...headers },
        signal: abortRef.current.signal,
      };
      if (["POST", "PUT", "PATCH"].includes(method) && body) {
        fetchOptions.body = body;
      }

      const response = await fetch(fullUrl, fetchOptions);
      const elapsed = performance.now() - startTime;
      const text = await response.text();

      entry.status = response.status;
      entry.responseBody = text;
      entry.durationMs = Math.round(elapsed);
    } catch (err) {
      const elapsed = performance.now() - startTime;
      entry.durationMs = Math.round(elapsed);
      entry.error =
        err instanceof Error ? err.message : "Request failed";
    }

    setCurrentResponse(entry);
    setHistory((prev) => [entry, ...prev].slice(0, maxHistory));
    setIsLoading(false);
  }, [method, fullUrl, headers, body, maxHistory]);

  const addHeader = useCallback(() => {
    if (newHeaderKey) {
      setHeaders((prev) => ({ ...prev, [newHeaderKey]: newHeaderValue }));
      setNewHeaderKey("");
      setNewHeaderValue("");
    }
  }, [newHeaderKey, newHeaderValue]);

  const removeHeader = useCallback((key: string) => {
    setHeaders((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const loadFromHistory = useCallback((entry: RequestHistoryEntry) => {
    setMethod(entry.method);
    setPath(new URL(entry.url, "http://localhost").pathname.replace(baseUrl, ""));
    setHeaders(entry.headers);
    setBody(entry.body ?? "");
    setCurrentResponse(entry);
    setActiveTab("response");
  }, [baseUrl]);

  const generatedCode = useMemo(
    () => generateCode(codeLanguage, method, fullUrl, headers, body || null),
    [codeLanguage, method, fullUrl, headers, body]
  );

  return (
    <div className={cn("flex h-full bg-white dark:bg-gray-900", className)}>
      {/* Endpoint browser sidebar */}
      <div className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-auto">
        <div className="p-3">
          <input
            type="text"
            placeholder="Search endpoints..."
            value={endpointSearch}
            onChange={(e) => setEndpointSearch(e.target.value)}
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
          />
        </div>
        {Array.from(groupedEndpoints.entries()).map(([cat, eps]) => (
          <div key={cat}>
            <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase">
              {cat}
            </div>
            {eps.map((ep) => (
              <button
                key={ep.id}
                onClick={() => setSelectedEndpoint(ep)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800",
                  selectedEndpoint?.id === ep.id &&
                    "bg-gray-100 dark:bg-gray-800"
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-bold px-1 rounded",
                    METHOD_COLORS[ep.method]
                  )}
                >
                  {ep.method}
                </span>
                <span className="truncate text-gray-700 dark:text-gray-300">
                  {ep.path}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* URL bar */}
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as HttpMethod)}
            className={cn(
              "rounded px-2 py-1 text-sm font-bold border-none",
              METHOD_COLORS[method]
            )}
          >
            {(["GET", "POST", "PUT", "PATCH", "DELETE"] as HttpMethod[]).map(
              (m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              )
            )}
          </select>
          <input
            type="text"
            value={fullUrl}
            onChange={(e) => setPath(e.target.value.replace(baseUrl, ""))}
            className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-mono"
          />
          <button
            onClick={sendRequest}
            disabled={isLoading}
            className="rounded bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isLoading ? "Sending..." : "Send"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-4">
          {(
            [
              { id: "builder", label: "Builder" },
              { id: "response", label: "Response" },
              { id: "history", label: `History (${history.length})` },
              { id: "codegen", label: "Code" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 py-2 text-sm border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Builder tab */}
          {activeTab === "builder" && (
            <div className="space-y-4">
              {/* Parameters */}
              {selectedEndpoint?.parameters &&
                selectedEndpoint.parameters.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Parameters</h3>
                    <div className="space-y-2">
                      {selectedEndpoint.parameters.map((param) => (
                        <div
                          key={param.name}
                          className="flex items-center gap-2"
                        >
                          <span className="text-xs text-gray-400 w-12">
                            {param.in}
                          </span>
                          <label className="text-sm w-32 shrink-0">
                            {param.name}
                            {param.required && (
                              <span className="text-red-500">*</span>
                            )}
                          </label>
                          <input
                            type="text"
                            value={paramValues[param.name] ?? param.defaultValue ?? ""}
                            onChange={(e) =>
                              setParamValues((prev) => ({
                                ...prev,
                                [param.name]: e.target.value,
                              }))
                            }
                            placeholder={param.description}
                            className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Headers */}
              <div>
                <h3 className="text-sm font-medium mb-2">Headers</h3>
                <div className="space-y-1">
                  {Object.entries(headers).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 text-sm">
                      <span className="w-40 truncate font-mono text-gray-600 dark:text-gray-400">
                        {k}
                      </span>
                      <span className="flex-1 truncate font-mono">{v}</span>
                      <button
                        onClick={() => removeHeader(k)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Header name"
                      value={newHeaderKey}
                      onChange={(e) => setNewHeaderKey(e.target.value)}
                      className="w-40 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      value={newHeaderValue}
                      onChange={(e) => setNewHeaderValue(e.target.value)}
                      className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
                    />
                    <button
                      onClick={addHeader}
                      className="rounded bg-gray-200 dark:bg-gray-700 px-2 py-1 text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Body */}
              {["POST", "PUT", "PATCH"].includes(method) && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Request Body</h3>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={8}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-mono"
                    placeholder='{"key": "value"}'
                  />
                </div>
              )}
            </div>
          )}

          {/* Response tab */}
          {activeTab === "response" && (
            <div>
              {isLoading ? (
                <div className="text-center text-gray-400 py-8">
                  Sending request...
                </div>
              ) : currentResponse ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <span
                      className={cn(
                        "font-bold",
                        currentResponse.status !== null &&
                          currentResponse.status < 300
                          ? "text-green-500"
                          : currentResponse.status !== null &&
                              currentResponse.status < 400
                            ? "text-yellow-500"
                            : "text-red-500"
                      )}
                    >
                      {currentResponse.status ?? "Error"}
                    </span>
                    <span className="text-gray-400">
                      {currentResponse.durationMs}ms
                    </span>
                    {currentResponse.error && (
                      <span className="text-red-400">
                        {currentResponse.error}
                      </span>
                    )}
                  </div>
                  {currentResponse.responseBody && (
                    <pre
                      className="rounded bg-gray-950 p-4 text-xs overflow-auto max-h-[60vh] font-mono"
                      dangerouslySetInnerHTML={{
                        __html: highlightJson(currentResponse.responseBody),
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  Send a request to see the response
                </div>
              )}
            </div>
          )}

          {/* History tab */}
          {activeTab === "history" && (
            <div>
              {history.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  No request history yet
                </div>
              ) : (
                <div className="space-y-1">
                  {history.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => loadFromHistory(entry)}
                      className="flex w-full items-center gap-3 rounded px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
                    >
                      <span
                        className={cn(
                          "text-xs font-bold px-1 rounded shrink-0",
                          METHOD_COLORS[entry.method]
                        )}
                      >
                        {entry.method}
                      </span>
                      <span className="flex-1 truncate font-mono text-gray-600 dark:text-gray-400">
                        {entry.url}
                      </span>
                      <span
                        className={cn(
                          "shrink-0",
                          entry.status !== null && entry.status < 300
                            ? "text-green-500"
                            : "text-red-500"
                        )}
                      >
                        {entry.status ?? "Err"}
                      </span>
                      <span className="text-gray-400 shrink-0 text-xs">
                        {entry.durationMs}ms
                      </span>
                      <span className="text-gray-400 shrink-0 text-xs">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Code generation tab */}
          {activeTab === "codegen" && (
            <div>
              <div className="flex gap-2 mb-3">
                {(
                  ["curl", "javascript", "python", "typescript"] as CodeLanguage[]
                ).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setCodeLanguage(lang)}
                    className={cn(
                      "rounded px-3 py-1 text-sm capitalize",
                      codeLanguage === lang
                        ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                    )}
                  >
                    {lang}
                  </button>
                ))}
              </div>
              <pre className="rounded bg-gray-950 p-4 text-xs overflow-auto font-mono text-gray-300 whitespace-pre-wrap">
                {generatedCode}
              </pre>
              <button
                onClick={() => navigator.clipboard?.writeText(generatedCode)}
                className="mt-2 rounded bg-gray-200 dark:bg-gray-700 px-3 py-1 text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Copy to clipboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ApiPlayground;
