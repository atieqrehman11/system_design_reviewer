/**
 * Public API for the core chat-ui library.
 * Only import from this file when consuming core from outside src/core/.
 */

// Types
export type {
  ResponseFormat,
  StreamResult,
  ReportData,
  Message,
  ChatMessage,
  ChatRequest,
  ChatChunkResponse,
  StreamEventTransformer,
  StreamEventHandler,
  StreamErrorHandler,
  StreamCompleteHandler,
} from './types/core';
export { MessageType, ApiError } from './types/core';

// Config
export type { ChatUIConfig, FileUploadConfig, ErrorMessages } from './config/ChatUIConfig';
export { createDefaultChatUIConfig, validateChatUIConfig } from './config/ChatUIConfig';

// Components
export { default as ChatInterface } from './components/ChatInterface';
export type { ChatInterfaceProps } from './components/ChatInterface';
export { default as MessageBubble } from './components/MessageBubble';
export type { MessageBubbleProps } from './components/MessageBubble';

// Hooks
export { useChatInterface } from './components/ChatInterface/useChatInterface';
export type { UseChatInterfaceReturn } from './components/ChatInterface/useChatInterface';

// Utilities
export { generateMessageId, generateCorrelationId } from './utils/id';
export { mergeAgentResult, findLastThinkingIndex } from './components/ChatInterface/chatStreamUtils';
