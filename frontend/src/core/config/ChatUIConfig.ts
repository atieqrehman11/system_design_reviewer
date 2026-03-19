import { ChatMessage } from '../types/core';
import {
  API_CONFIG,
  ERROR_MESSAGES,
  FILE_UPLOAD_CONFIG,
  UI_TEXT,
} from '../../config/constants';

/** Configuration for file upload behaviour. */
export interface FileUploadConfig {
  maxFileSizeMB: number;
  /** Derived: maxFileSizeMB * 1024 * 1024 — never hardcode this */
  maxFileSizeBytes: number;
  acceptedFileTypes: string[];
  acceptedMimeTypes: string[];
}

/** User-facing error message strings. */
export interface ErrorMessages {
  networkError: string;
  fileTooLarge: string;
  invalidFileType: string;
  generic: string;
}

/** All runtime configuration injected into the Chat_UI at application startup. */
export interface ChatUIConfig {
  // Display
  appTitle: string;
  appSubtitle: string;
  inputPlaceholder: string;
  chatPlaceholder: string;
  submitButtonText: string;
  emptyStateMessage: string;
  assistantName: string;
  // API
  apiBaseUrl: string;
  submitEndpoint: string;
  chatEndpoint: string;
  // Optional body builders — defaults preserve backward compatibility
  buildSubmitRequestBody?: (content: string, correlationId: string) => Record<string, unknown>;
  buildChatRequestBody?: (correlationId: string, messages: ChatMessage[]) => Record<string, unknown>;
  // File upload
  fileUpload: FileUploadConfig;
  // Error messages
  errorMessages: ErrorMessages;
}

/**
 * Required string fields that must be non-empty for a valid ChatUIConfig.
 * Used by validateChatUIConfig to iterate and check each field.
 */
const REQUIRED_STRING_FIELDS: ReadonlyArray<keyof ChatUIConfig> = [
  'appTitle',
  'appSubtitle',
  'inputPlaceholder',
  'chatPlaceholder',
  'submitButtonText',
  'emptyStateMessage',
  'assistantName',
  'apiBaseUrl',
  'submitEndpoint',
  'chatEndpoint',
];

/**
 * Returns a fully populated ChatUIConfig using values from constants.ts as defaults.
 * Integrations call this and override only the fields they need.
 *
 * @param overrides - Optional partial config to merge shallowly onto the defaults.
 * @returns A complete ChatUIConfig instance.
 */
export function createDefaultChatUIConfig(overrides?: Partial<ChatUIConfig>): ChatUIConfig {
  const defaults: ChatUIConfig = {
    appTitle: UI_TEXT.appTitle,
    appSubtitle: UI_TEXT.appSubtitle,
    inputPlaceholder: UI_TEXT.inputPlaceholder,
    chatPlaceholder: UI_TEXT.chatPlaceholder,
    submitButtonText: UI_TEXT.submitButtonText,
    emptyStateMessage: UI_TEXT.emptyStateMessage,
    assistantName: UI_TEXT.assistantName,
    apiBaseUrl: API_CONFIG.baseUrl,
    submitEndpoint: API_CONFIG.reviewEndpoint,
    chatEndpoint: API_CONFIG.chatEndpoint,
    fileUpload: {
      maxFileSizeMB: FILE_UPLOAD_CONFIG.maxFileSizeMB,
      maxFileSizeBytes: FILE_UPLOAD_CONFIG.maxFileSizeMB * 1024 * 1024,
      acceptedFileTypes: FILE_UPLOAD_CONFIG.acceptedFileTypes,
      acceptedMimeTypes: FILE_UPLOAD_CONFIG.acceptedMimeTypes,
    },
    errorMessages: {
      networkError: ERROR_MESSAGES.networkError,
      fileTooLarge: ERROR_MESSAGES.fileTooLarge,
      invalidFileType: ERROR_MESSAGES.invalidFileType,
      generic: ERROR_MESSAGES.genericError,
    },
  };

  return { ...defaults, ...overrides };
}

/**
 * Validates that all required string fields in a ChatUIConfig are present and non-empty.
 * Throws a descriptive Error identifying the first missing or empty field found.
 *
 * @param config - The ChatUIConfig instance to validate.
 * @throws {Error} If any required string field is missing or empty.
 */
export function validateChatUIConfig(config: ChatUIConfig): void {
  for (const field of REQUIRED_STRING_FIELDS) {
    if (!config[field]) {
      throw new Error(`ChatUIConfig: required field '${field}' is missing or empty`);
    }
  }
}
