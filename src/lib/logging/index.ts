import { db } from "@/lib/db";
import { errorEvents } from "@/lib/db/schema";

type LogContext = Record<string, unknown>;

function emit(level: "info" | "warn" | "error", message: string, context: LogContext) {
  const line = JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    ...context,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, context: LogContext = {}) => emit("info", message, context),
  warn: (message: string, context: LogContext = {}) => emit("warn", message, context),
  error: (message: string, context: LogContext = {}) => emit("error", message, context),
};

export type ErrorCapture = {
  error: unknown;
  route?: string;
  action?: string;
  requestId?: string;
  storeId?: string;
  userId?: string;
  severity?: "info" | "warning" | "error" | "critical";
  context?: LogContext;
};

export async function captureError(input: ErrorCapture) {
  const error = input.error;
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  logger.error(message, {
    route: input.route,
    action: input.action,
    requestId: input.requestId,
    storeId: input.storeId,
    userId: input.userId,
    stack,
    ...input.context,
  });

  try {
    await db.insert(errorEvents).values({
      requestId: input.requestId ?? crypto.randomUUID(),
      storeId: input.storeId ?? null,
      userId: input.userId ?? null,
      route: input.route ?? null,
      action: input.action ?? null,
      message: message.slice(0, 2000),
      stack: stack?.slice(0, 8000) ?? null,
      severity: input.severity ?? "error",
      context: (input.context ?? {}) as Record<string, unknown>,
    });
  } catch (dbError) {
    logger.error("failed to persist error event", { original: message, dbError: String(dbError) });
  }
}
