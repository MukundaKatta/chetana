/**
 * GraphQL subscriptions over WebSocket (Issue #439).
 * Implements a client manager with auto-reconnect, heartbeat,
 * and filtering by audit ID / model.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "closed";

export interface SubscriptionMessage<T = unknown> {
  id: string;
  type:
    | "connection_init"
    | "connection_ack"
    | "subscribe"
    | "next"
    | "error"
    | "complete"
    | "ping"
    | "pong";
  payload?: T;
}

export interface SubscriptionFilter {
  auditId?: string;
  modelId?: string;
}

export interface AuditProgressPayload {
  auditId: string;
  modelId: string;
  progress: number;
  currentProbe: string;
  totalProbes: number;
  completedProbes: number;
}

export interface ScoreUpdatePayload {
  auditId: string;
  modelId: string;
  theory: string;
  score: number;
  previousScore: number | null;
  updatedAt: string;
}

export type SubscriptionPayload = AuditProgressPayload | ScoreUpdatePayload;

type MessageHandler<T = unknown> = (data: T) => void;
type ErrorHandler = (error: Error) => void;
type StateChangeHandler = (state: ConnectionState) => void;

export interface SubscriptionHandle {
  /** Unique subscription ID. */
  id: string;
  /** Unsubscribe and clean up. */
  unsubscribe: () => void;
}

export interface GraphQLSubscriptionClientConfig {
  /** WebSocket endpoint URL. */
  url: string;
  /** Connection parameters (e.g. auth token). */
  connectionParams?: Record<string, unknown>;
  /** Auto-reconnect on disconnect (default true). */
  autoReconnect?: boolean;
  /** Maximum reconnection attempts (default 10). */
  maxReconnectAttempts?: number;
  /** Base delay for exponential backoff in ms (default 1000). */
  reconnectBaseDelay?: number;
  /** Heartbeat interval in ms (default 30000). */
  heartbeatInterval?: number;
  /** Heartbeat timeout in ms (default 10000). */
  heartbeatTimeout?: number;
}

/* ------------------------------------------------------------------ */
/*  Subscription client                                               */
/* ------------------------------------------------------------------ */

export class GraphQLSubscriptionClient {
  private ws: WebSocket | null = null;
  private state: ConnectionState = "disconnected";
  private subscriptions = new Map<
    string,
    {
      query: string;
      variables?: Record<string, unknown>;
      filter?: SubscriptionFilter;
      handler: MessageHandler;
      errorHandler?: ErrorHandler;
    }
  >();
  private stateListeners = new Set<StateChangeHandler>();
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private nextId = 1;
  private readonly config: Required<GraphQLSubscriptionClientConfig>;

  constructor(config: GraphQLSubscriptionClientConfig) {
    this.config = {
      url: config.url,
      connectionParams: config.connectionParams ?? {},
      autoReconnect: config.autoReconnect ?? true,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
      reconnectBaseDelay: config.reconnectBaseDelay ?? 1000,
      heartbeatInterval: config.heartbeatInterval ?? 30_000,
      heartbeatTimeout: config.heartbeatTimeout ?? 10_000,
    };
  }

  /* ---------------------------------------------------------------- */
  /*  Connection lifecycle                                            */
  /* ---------------------------------------------------------------- */

  /**
   * Establish the WebSocket connection.
   */
  connect(): void {
    if (this.state === "connected" || this.state === "connecting") return;

    this.setState(
      this.reconnectAttempt > 0 ? "reconnecting" : "connecting",
    );

    try {
      this.ws = new WebSocket(this.config.url, "graphql-transport-ws");
    } catch {
      this.handleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.send({
        id: "",
        type: "connection_init",
        payload: this.config.connectionParams,
      });
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(
          typeof event.data === "string" ? event.data : "",
        ) as SubscriptionMessage;
        this.handleMessage(msg);
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onerror = () => {
      this.handleReconnect();
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      if (this.state !== "closed") {
        this.handleReconnect();
      }
    };
  }

  /**
   * Gracefully close the connection.
   */
  disconnect(): void {
    this.setState("closed");
    this.stopHeartbeat();
    this.clearReconnectTimer();
    for (const [id] of this.subscriptions) {
      this.send({ id, type: "complete" });
    }
    this.subscriptions.clear();
    this.ws?.close();
    this.ws = null;
  }

  /**
   * Current connection state.
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Listen for connection state changes.
   */
  onStateChange(handler: StateChangeHandler): () => void {
    this.stateListeners.add(handler);
    return () => {
      this.stateListeners.delete(handler);
    };
  }

  /* ---------------------------------------------------------------- */
  /*  Subscriptions                                                   */
  /* ---------------------------------------------------------------- */

  /**
   * Subscribe to a GraphQL subscription query.
   */
  subscribe<T = unknown>(
    query: string,
    variables: Record<string, unknown> | undefined,
    handler: MessageHandler<T>,
    errorHandler?: ErrorHandler,
    filter?: SubscriptionFilter,
  ): SubscriptionHandle {
    const id = String(this.nextId++);

    this.subscriptions.set(id, {
      query,
      variables,
      filter,
      handler: handler as MessageHandler,
      errorHandler,
    });

    // Send subscribe message if connected
    if (this.state === "connected") {
      this.sendSubscribe(id, query, variables);
    }

    return {
      id,
      unsubscribe: () => {
        this.subscriptions.delete(id);
        if (this.state === "connected") {
          this.send({ id, type: "complete" });
        }
      },
    };
  }

  /**
   * Subscribe to audit progress updates.
   */
  subscribeToAuditProgress(
    filter: SubscriptionFilter,
    handler: MessageHandler<AuditProgressPayload>,
    errorHandler?: ErrorHandler,
  ): SubscriptionHandle {
    const query = `
      subscription AuditProgress($auditId: ID, $modelId: String) {
        auditProgress(auditId: $auditId, modelId: $modelId) {
          auditId
          modelId
          progress
          currentProbe
          totalProbes
          completedProbes
        }
      }
    `;
    return this.subscribe(
      query,
      { auditId: filter.auditId, modelId: filter.modelId },
      handler,
      errorHandler,
      filter,
    );
  }

  /**
   * Subscribe to score update events.
   */
  subscribeToScoreUpdates(
    filter: SubscriptionFilter,
    handler: MessageHandler<ScoreUpdatePayload>,
    errorHandler?: ErrorHandler,
  ): SubscriptionHandle {
    const query = `
      subscription ScoreUpdates($auditId: ID, $modelId: String) {
        scoreUpdated(auditId: $auditId, modelId: $modelId) {
          auditId
          modelId
          theory
          score
          previousScore
          updatedAt
        }
      }
    `;
    return this.subscribe(
      query,
      { auditId: filter.auditId, modelId: filter.modelId },
      handler,
      errorHandler,
      filter,
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Message handling                                                */
  /* ---------------------------------------------------------------- */

  private handleMessage(msg: SubscriptionMessage): void {
    switch (msg.type) {
      case "connection_ack":
        this.setState("connected");
        this.reconnectAttempt = 0;
        this.startHeartbeat();
        // Resubscribe all active subscriptions
        for (const [id, sub] of this.subscriptions) {
          this.sendSubscribe(id, sub.query, sub.variables);
        }
        break;

      case "next": {
        const sub = this.subscriptions.get(msg.id);
        if (sub) {
          const payload = msg.payload as Record<string, unknown> | undefined;
          if (payload && this.matchesFilter(payload, sub.filter)) {
            sub.handler(payload);
          }
        }
        break;
      }

      case "error": {
        const sub = this.subscriptions.get(msg.id);
        if (sub?.errorHandler) {
          sub.errorHandler(
            new Error(
              typeof msg.payload === "string"
                ? msg.payload
                : JSON.stringify(msg.payload),
            ),
          );
        }
        break;
      }

      case "complete":
        this.subscriptions.delete(msg.id);
        break;

      case "ping":
        this.send({ id: "", type: "pong" });
        break;

      case "pong":
        this.clearHeartbeatTimeout();
        break;
    }
  }

  /**
   * Check if a payload matches the subscription filter.
   */
  private matchesFilter(
    payload: Record<string, unknown>,
    filter?: SubscriptionFilter,
  ): boolean {
    if (!filter) return true;

    // Look inside nested data for matching fields
    const data =
      typeof payload === "object" ? Object.values(payload)[0] : payload;
    const record = data as Record<string, unknown> | undefined;

    if (filter.auditId && record?.auditId !== filter.auditId) return false;
    if (filter.modelId && record?.modelId !== filter.modelId) return false;
    return true;
  }

  /* ---------------------------------------------------------------- */
  /*  Heartbeat                                                       */
  /* ---------------------------------------------------------------- */

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ id: "", type: "ping" });
      this.heartbeatTimeoutTimer = setTimeout(() => {
        // No pong received — connection is stale
        this.ws?.close();
      }, this.config.heartbeatTimeout);
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.clearHeartbeatTimeout();
  }

  private clearHeartbeatTimeout(): void {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Reconnection                                                    */
  /* ---------------------------------------------------------------- */

  private handleReconnect(): void {
    this.stopHeartbeat();
    this.ws = null;

    if (!this.config.autoReconnect) {
      this.setState("disconnected");
      return;
    }

    if (this.reconnectAttempt >= this.config.maxReconnectAttempts) {
      this.setState("disconnected");
      return;
    }

    this.setState("reconnecting");
    const delay = Math.min(
      this.config.reconnectBaseDelay * 2 ** this.reconnectAttempt,
      30_000,
    );
    this.reconnectAttempt++;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                         */
  /* ---------------------------------------------------------------- */

  private setState(state: ConnectionState): void {
    if (this.state === state) return;
    this.state = state;
    for (const listener of this.stateListeners) {
      try {
        listener(state);
      } catch {
        // Prevent listener errors from breaking state management
      }
    }
  }

  private send(msg: SubscriptionMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private sendSubscribe(
    id: string,
    query: string,
    variables?: Record<string, unknown>,
  ): void {
    this.send({
      id,
      type: "subscribe",
      payload: { query, variables },
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Factory                                                           */
/* ------------------------------------------------------------------ */

/**
 * Create a pre-configured subscription client.
 */
export function createSubscriptionClient(
  url: string,
  token?: string,
): GraphQLSubscriptionClient {
  return new GraphQLSubscriptionClient({
    url,
    connectionParams: token ? { authorization: `Bearer ${token}` } : {},
    autoReconnect: true,
    maxReconnectAttempts: 10,
    reconnectBaseDelay: 1000,
    heartbeatInterval: 30_000,
    heartbeatTimeout: 10_000,
  });
}
