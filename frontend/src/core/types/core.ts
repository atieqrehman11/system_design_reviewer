// Replaces OutputFormat
export type ResponseFormat = 'markdown' | 'plain' | 'json';

// Generic report payload — structural typing, no domain names
export type ReportData = Record<string, unknown>;

// Replaces ReviewStreamResult
export interface StreamResult {
  stream: ReadableStream<Uint8Array>;
  correlationId: string;
}

export enum MessageType {
  USER = 'user',
  AGENT_THINKING = 'agent_thinking',
  AGENT_RESULT = 'agent_result',
  SYSTEM_COMPLETE = 'system_complete',
  ERROR = 'error',
}

export interface Message {
  id: string;
  type: MessageType;
  content: string;
  timestamp: Date;
  agent?: string;
  report?: ReportData;
  correlationId?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  correlation_id: string;
  messages: ChatMessage[];
}

export interface ChatChunkResponse {
  chunk?: string;
  status?: 'complete' | 'error';
  message?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorType?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export interface StreamEventTransformer<TEvent> {
  /** Convert a raw stream event to a generic Message. Must be a pure function. */
  transform(event: TEvent, correlationId: string): Message;
  /** Return true when this event signals the end of the stream. Must be a pure function. */
  isComplete(event: TEvent): boolean;
}

export type StreamEventHandler<TEvent> = (event: TEvent) => void;
export type StreamErrorHandler = (error: Error) => void;
export type StreamCompleteHandler = () => void;
