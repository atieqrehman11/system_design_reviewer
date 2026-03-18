// Message Types
export enum MessageType {
  USER = 'user',
  AGENT_THINKING = 'agent_thinking',
  AGENT_RESULT = 'agent_result',
  SYSTEM_COMPLETE = 'system_complete',
  ERROR = 'error',
}

export type OutputFormat = 'markdown' | 'plain' | 'json';

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

// ReviewReport — mirrors backend ReviewReport / sub-schemas (final_report_schema.py)
export interface ReviewScorecard {
  architecture_health: string;
  primary_risks: string;
  primary_bottleneck: string;
}

export interface ReviewFinding {
  priority: 'High' | 'Medium' | 'Low';
  category: string;
  finding: string;
  impact: string;
  fix: string;
}

export interface ReviewReport {
  data_available: boolean;
  generated_at: string;
  scorecard?: ReviewScorecard;
  findings?: ReviewFinding[];
  deep_dive?: string;
  // Sub-agent reports are merged into the final report — allow extra keys
  [key: string]: unknown;
}

export interface ReviewRequest {
  design_doc: string;
  output_format?: OutputFormat;
}

// Chat follow-up types
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
