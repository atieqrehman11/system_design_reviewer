// API Configuration
export const API_CONFIG = {
  baseUrl: process.env.REACT_APP_API_BASE_URL || '/api/v1',
  reviewEndpoint: '/review',
};

// UI Text Constants
export const UI_TEXT = {
  appTitle: 'System Design Mentor',
  appSubtitle: 'AI-powered architecture analysis and recommendations',
  inputPlaceholder: 'Paste your design document here or upload a file...',
  submitButtonText: 'Review Design',
  fileUploadText: 'Upload File',
  emptyStateMessage: 'Submit a design document to receive architectural analysis',
};

// File Upload Configuration
export const FILE_UPLOAD_CONFIG = {
  maxFileSizeMB: 5,
  maxFileSizeBytes: 5 * 1024 * 1024, // 5MB in bytes
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
