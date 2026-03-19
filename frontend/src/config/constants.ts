// ---------------------------------------------------------------------------
// Runtime warnings
// ---------------------------------------------------------------------------

if (process.env.NODE_ENV === 'production' && !process.env.REACT_APP_API_BASE_URL) {
  console.warn(
    '[config] REACT_APP_API_BASE_URL is not set. Falling back to /api/v1. ' +
    'This may not work correctly in production.',
  );
}

// ---------------------------------------------------------------------------
// API Configuration
// ---------------------------------------------------------------------------

export const API_CONFIG = {
  baseUrl: process.env.REACT_APP_API_BASE_URL || '/api/v1',
  reviewEndpoint: process.env.REACT_APP_SUBMIT_ENDPOINT || '/review',
  chatEndpoint: process.env.REACT_APP_CHAT_ENDPOINT || '/chat',
};

// ---------------------------------------------------------------------------
// UI Text — all overridable via REACT_APP_* env vars
// ---------------------------------------------------------------------------

export const UI_TEXT = {
  appTitle: process.env.REACT_APP_APP_TITLE || 'System Design Mentor',
  appSubtitle: process.env.REACT_APP_APP_SUBTITLE || 'AI-powered architecture analysis and recommendations',
  assistantName: process.env.REACT_APP_ASSISTANT_NAME || 'Architect Assistant',
  inputPlaceholder: process.env.REACT_APP_INPUT_PLACEHOLDER || 'Paste your design document here or upload a file...',
  chatPlaceholder: process.env.REACT_APP_CHAT_PLACEHOLDER || 'Ask a follow-up question about the review...',
  submitButtonText: process.env.REACT_APP_SUBMIT_BUTTON_TEXT || 'Review Design',
  emptyStateMessage: process.env.REACT_APP_EMPTY_STATE_MESSAGE || 'Submit a design document to get started with your architectural review',
};

// ---------------------------------------------------------------------------
// File Upload Configuration
// Max size is env-configurable; accepted types are structural (not deployment config)
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE_MB = Number(process.env.REACT_APP_MAX_FILE_SIZE_MB) || 5;

export const FILE_UPLOAD_CONFIG = {
  maxFileSizeMB: MAX_FILE_SIZE_MB,
  maxFileSizeBytes: MAX_FILE_SIZE_MB * 1024 * 1024,
  acceptedFileTypes: ['.txt', '.md', '.json', '.pdf', '.doc', '.docx'],
  acceptedMimeTypes: [
    'text/plain',
    'text/markdown',
    'application/json',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

// ---------------------------------------------------------------------------
// Error Messages — not deployment-specific, no env vars needed
// ---------------------------------------------------------------------------

export const ERROR_MESSAGES = {
  networkError: 'Unable to connect to the server. Please check your connection.',
  fileTooLarge: `File size exceeds ${FILE_UPLOAD_CONFIG.maxFileSizeMB}MB limit`,
  invalidFileType: `Please upload a valid file type: ${FILE_UPLOAD_CONFIG.acceptedFileTypes.join(', ')}`,
  genericError: 'An unexpected error occurred. Please try again.',
};
