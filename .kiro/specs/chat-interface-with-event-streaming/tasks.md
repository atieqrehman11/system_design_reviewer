# Implementation Plan

- [x] 1. Set up basic configuration
  - Create simple constants file in `frontend/src/config/constants.ts` with API endpoint using environment variable (REACT_APP_API_BASE_URL with fallback to proxy)
  - Add basic UI text constants (placeholders, button labels) that can be easily changed later
  - Create `.env.example` file with REACT_APP_API_BASE_URL variable
  - _Requirements: 1.1, 1.3_

- [x] 2. Implement core data models and types
  - Create single types file `frontend/src/types/index.ts` with all TypeScript interfaces
  - Define Message interface, MessageType enum, and ReviewResponse interface
  - Add ApiError class for error handling
  - _Requirements: 1.3, 7.1, 7.2, 7.3_

- [x] 3. Build API service layer
  - Create modular API service structure in `frontend/src/services/api/` with separate files for client, stream, transformer, and retry logic
  - Implement NDJSON stream parser function that handles ReadableStream and processes line-by-line
  - Add error handling and retry logic with configurable retry attempts
  - Implement event-to-message transformation utility function
  - Create utility functions for ID generation and AbortSignal handling
  - Write minimal critical tests for service layer (transformer, stream, retry, id utilities)
  - _Requirements: 1.3, 2.1, 7.1, 7.2, 7.3, 7.4_

- [x] 4. Create MessageBubble component
  - Implement MessageBubble component in `frontend/src/components/MessageBubble.tsx`
  - Add conditional styling based on message type (user, agent_thinking, agent_result, system_complete, error)
  - Create animated thinking indicator with pulsing dots
  - Implement report content formatting for structured display
  - Add timestamp display with proper formatting
  - Create CSS module `MessageBubble.module.css` with responsive styles
  - _Requirements: 2.2, 2.3, 2.4, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 5. Build MessageList component with auto-scroll
  - Create MessageList component in `frontend/src/components/MessageList.tsx`
  - Implement auto-scroll logic that scrolls to bottom on new messages
  - Add scroll detection to disable auto-scroll when user scrolls up
  - Render MessageBubble components for each message
  - Add loading indicator display during streaming
  - Create CSS module `MessageList.module.css` with scrollable container styles
  - _Requirements: 2.5, 4.1, 4.2, 4.3, 4.4_

- [x] 6. Implement FileUploader component
  - Create FileUploader component in `frontend/src/components/FileUploader.tsx`
  - Add file input button and drag-and-drop area
  - Implement file reading with FileReader API
  - Add file type validation for .txt, .md, .json files
  - Add file size validation with 1MB max size
  - Display upload status and error messages
  - Create CSS module `FileUploader.module.css` with drag-and-drop styling
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 7. Create InputArea component
  - Implement InputArea component in `frontend/src/components/InputArea.tsx`
  - Add textarea for text input with placeholder text
  - Integrate FileUploader component
  - Add submit button
  - Implement input clearing after submission
  - Add disabled state during active streaming
  - Create CSS module `InputArea.module.css` with responsive layout
  - _Requirements: 1.1, 1.2, 1.4, 5.5_

- [x] 8. Build main ChatInterface component
  - Create ChatInterface component in `frontend/src/components/ChatInterface.tsx`
  - Implement state management with useState hooks for messages, isStreaming, error, correlationId
  - Create handleSubmit function that adds user message and initiates API call
  - Implement stream event handler that transforms events to messages and updates state
  - Add error handling that displays error messages in chat
  - Integrate MessageList and InputArea components
  - Create CSS module `ChatInterface.module.css` with main layout
  - _Requirements: 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 9. Update App component
  - Modify `frontend/src/App.tsx` to render ChatInterface component
  - Add basic header with title and subtitle
  - Apply basic layout styling
  - _Requirements: 1.1_

- [ ]* 10. Create public configuration file for future customization
  - Create `frontend/public/config.json` with system design mentor branding
  - Include all UI text customizations for the design review use case
  - Set API endpoint configuration
  - Configure file upload settings
  - _Requirements: 1.1_

- [x] 11. Implement responsive styling
  - Create global styles in `frontend/src/index.css` with CSS variables for theming
  - Add media queries for mobile (<768px), tablet (768-1024px), and desktop (>1024px)
  - Ensure message bubbles adapt to screen width
  - Make input area responsive with proper touch targets
  - Test layout on different viewport sizes
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 12. Add accessibility features
  - Add ARIA labels to all interactive elements (buttons, inputs, file upload)
  - Implement keyboard navigation support (Tab, Enter, Escape)
  - Add ARIA live region for message updates
  - Ensure focus indicators are visible on all interactive elements
  - Verify color contrast ratios meet WCAG AA standards
  - _Requirements: 8.5_

- [ ]* 13. Add advanced configuration system
  - Create configuration types and interfaces in `frontend/src/types/config.ts`
  - Implement configuration loader that loads and merges config.json with defaults
  - Create ConfigContext pro/*vider for accessing config throughout the app
  - Update components to use configuration from context
  - _Requirements: 1.1, 8.1_

- [ ]* 14. Write unit tests for core functionality
  - Write tests for MessageBubble component rendering different message types
  - Write tests for InputArea validation and submission
  - Write tests for FileUploader file handling and validation
  - Write tests for API service NDJSON parsing
  - Write tests for configuration loader
  - _Requirements: All_

- [ ]* 15. Create integration test for end-to-end flow
  - Write test that submits a message and verifies event stream processing
  - Write test for file upload and submission flow
  - Write test for error handling scenarios
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 5.1, 5.2, 5.3, 7.1, 7.2, 7.3_
some