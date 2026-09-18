/**
 * Structured JSON Logger for Observability
 * Replaces console.log with structured JSON logging for all recommendation agent events.
 */

export interface StructuredLogPayload {
  level: "info" | "warn" | "error";
  event: string;
  profileId?: number;
  openingId?: string;
  startTime?: string;
  parsingTimeMs?: number;
  matchingTimeMs?: number;
  totalLatencyMs?: number;
  finalScore?: number;
  decision?: string;
  toolCallSequence?: string[];
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  error?: string;
  metadata?: Record<string, any>;
}

export function logStructured(payload: StructuredLogPayload): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...payload,
  };

  // Structured single-line JSON log output
  process.stdout.write(JSON.stringify(logEntry) + "\n");
}
