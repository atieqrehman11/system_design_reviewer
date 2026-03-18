// API Configuration
if (process.env.NODE_ENV === 'production' && !process.env.REACT_APP_API_BASE_URL) {
  console.warn(
    '[config] REACT_APP_API_BASE_URL is not set. Falling back to /api/v1. ' +
    'This may not work correctly in production.',
  );
}

export const API_CONFIG = {
  baseUrl: process.env.REACT_APP_API_BASE_URL || '/api/v1',
  reviewEndpoint: '/review',
  chatEndpoint: '/chat',
};

// UI Text Constants
export const UI_TEXT = {
  appTitle: 'System Design Mentor',
  appSubtitle: 'AI-powered architecture analysis and recommendations',
  inputPlaceholder: 'Paste your design document here or upload a file...',
  chatPlaceholder: 'Ask a follow-up question about the review...',
  submitButtonText: 'Review Design',
  fileUploadText: 'Upload File',
  emptyStateMessage: 'Submit a design document to get started with your architectural review',
  streamingThinking: 'Thinking...',
  streamingProcessing: 'Processing...',
};

// File Upload Configuration
const MAX_FILE_SIZE_MB = 5;

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

// Error Messages
export const ERROR_MESSAGES = {
  networkError: 'Unable to connect to the server. Please check your connection.',
  fileTooLarge: `File size exceeds ${FILE_UPLOAD_CONFIG.maxFileSizeMB}MB limit`,
  invalidFileType: `Please upload a valid file type: ${FILE_UPLOAD_CONFIG.acceptedFileTypes.join(', ')}`,
  genericError: 'An unexpected error occurred. Please try again.',
};
