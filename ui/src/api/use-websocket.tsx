import { useEffect, useRef, useState, useCallback } from "react";

export type UseWebSocketOptions = {
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMessage?: (data: any) => void;
  debug?: boolean;
  shouldReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
};

export type UseWebSocketReturn = {
  isConnected: boolean;
  sendMessage: (message: string) => void;
  disconnect: () => void;
  reconnect: () => void;
};

const getWebSocketUrl = (path: string): string => {
  const wsBaseUrl = import.meta.env.VITE_WS_URL;
  if (!wsBaseUrl) {
    throw new Error("VITE_WS_URL environment variable is not defined");
  }
  return `${wsBaseUrl}${path}`;
};

export const useWebSocket = (
  path: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn => {
  const {
    onOpen,
    onClose,
    onError,
    onMessage,
    debug = false,
    shouldReconnect = true,
    reconnectInterval = 1000,
    maxReconnectAttempts = 5,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const reconnectAttemptsRef = useRef(0);
  const shouldConnectRef = useRef(true);

  // Store latest callbacks in ref to avoid stale closures
  const callbacksRef = useRef({ onOpen, onClose, onError, onMessage });
  callbacksRef.current = { onOpen, onClose, onError, onMessage };

  const log = useCallback(
    (message: string, ...args: unknown[]) => {
      if (debug) console.log(`[useWebSocket] ${message}`, ...args);
    },
    [debug]
  );

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false;
    clearReconnectTimeout();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    reconnectAttemptsRef.current = 0;
  }, [clearReconnectTimeout]);

  const connect = useCallback(() => {
    // Don't connect if we shouldn't or already connected
    if (
      !shouldConnectRef.current ||
      wsRef.current?.readyState === WebSocket.OPEN
    ) {
      return;
    }

    // Check reconnect attempts
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      log(`Max reconnect attempts (${maxReconnectAttempts}) reached`);
      return;
    }

    const wsUrl = getWebSocketUrl(path);
    log("Connecting to:", wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = (event) => {
      if (!shouldConnectRef.current) {
        ws.close();
        return;
      }

      reconnectAttemptsRef.current = 0;
      setIsConnected(true);
      log("WebSocket connected");
      callbacksRef.current.onOpen?.(event);
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      wsRef.current = null;
      log("WebSocket closed:", event.code, event.reason);
      callbacksRef.current.onClose?.(event);

      // Reconnect if enabled and not a normal closure
      if (shouldReconnect && shouldConnectRef.current && event.code !== 1000) {
        reconnectAttemptsRef.current++;
        const delay =
          reconnectInterval * Math.pow(1.5, reconnectAttemptsRef.current - 1);

        log(
          `Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`
        );

        reconnectTimeoutRef.current = setTimeout(() => {
          if (shouldConnectRef.current) connect();
        }, delay);
      }
    };

    ws.onerror = (event) => {
      log("WebSocket error:", event);
      callbacksRef.current.onError?.(event);
    };

    ws.onmessage = (event) => {
      if (!shouldConnectRef.current) return;

      try {
        const data = JSON.parse(event.data);
        log("Received message:", data);
        callbacksRef.current.onMessage?.(data);
      } catch (error) {
        log("Failed to parse message:", event.data, error);
        callbacksRef.current.onMessage?.(event.data);
      }
    };
  }, [path, log, shouldReconnect, reconnectInterval, maxReconnectAttempts]);

  const sendMessage = useCallback(
    (message: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        log("Sending message:", message);
        wsRef.current.send(message);
      } else {
        log("Cannot send message, WebSocket not connected");
      }
    },
    [log]
  );

  const reconnect = useCallback(() => {
    disconnect();
    // Small delay to ensure cleanup is complete
    setTimeout(() => {
      shouldConnectRef.current = true;
      reconnectAttemptsRef.current = 0;
      connect();
    }, 100);
  }, [disconnect, connect]);

  // Initialize connection
  useEffect(() => {
    shouldConnectRef.current = true;
    connect();

    return disconnect;
  }, [connect, disconnect]);

  return {
    isConnected,
    sendMessage,
    disconnect,
    reconnect,
  };
};
