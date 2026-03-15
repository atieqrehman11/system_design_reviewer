// Message Types
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
  report?: ReviewReport;
  correlationId?: string;
}

// API Response Types (matching backend schema)
export interface ReviewResponse {
  agent?: string;
  message_type?: string;
  status?: string;
  message?: string;
  report?: ReviewReport;
}

export interface ReviewReport {
  [key: string]: any; // Flexible structure for report content
}

export interface ErrorResponse {
  success: boolean;
  status_code: number;
  message: string;
  error_type: string;
  feedback?: string;
}

// API Error Class
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorType?: string
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// Utility type for stream event handlers
export type StreamEventHandler = (event: ReviewResponse) => void;
export type StreamErrorHandler = (error: Error) => void;
export type StreamCompleteHandler = () => void;
