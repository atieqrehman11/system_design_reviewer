# Design Document: Generic Chat Interface with Event Streaming

## Overview

This design outlines a generic, configurable React-based chat interface that consumes NDJSON event streams from backend APIs. The interface is designed to be reusable across different use cases (system design review, code review, document analysis, etc.) by externalizing all domain-specific text and configuration. The architecture follows a component-based approach with clear separation between UI presentation, state management, API communication, and configuration.

## Development Standards and Best Practices

### Code Quality Standards

All code must adhere to the following standards to ensure maintainability, scalability, and extensibility:

1. **Single Responsibility Principle (SRP)**
   - Each function should have one clear purpose
   - Keep functions small (ideally < 20 lines)
   - Extract helper functions when logic becomes complex

2. **Modular Architecture**
   - Organize code into focused modules (max 200-300 lines per file)
   - Use barrel exports (index.ts) for clean public APIs
   - Separate concerns: UI components, business logic, utilities, types

3. **Type Safety**
   - Use TypeScript strict mode
   - Avoid `any` types - use proper interfaces or `unknown`
   - No type assertions (`as`) unless absolutely necessary
   - Export all reusable types and interfaces

4. **Code Smells to Avoid**
   - No magic numbers or strings - use constants
   - No deeply nested conditionals (max 3 levels)
   - No duplicate code - extract to shared functions
   - No large functions - break down into smaller units
   - No functions with too many parameters (max 4)

5. **SonarQube Compliance**
   - Address all critical and major issues
   - Keep cognitive complexity below 15
   - Move helper functions to outer scope when appropriate
   - Use proper error handling (no empty catch blocks)
   - Follow naming conventions (camelCase for functions/variables, PascalCase for components/types)

6. **Scalability and Extensibility**
   - Design for change - use dependency injection where appropriate
   - Prefer composition over inheritance
   - Use configuration over hard-coding
   - Write code that's easy to test in isolation
   - Document public APIs with JSDoc comments

7. **Testing Requirements**
   - Write tests for critical business logic
   - Test happy paths and error scenarios
   - Keep tests simple and focused
   - Mock external dependencies
   - Aim for meaningful coverage, not 100%

8. **Performance Considerations**
   - Use React.memo for expensive components
   - Implement proper cleanup in useEffect
   - Avoid unnecessary re-renders
   - Use proper key props in lists
   - Debounce/throttle expensive operations

### File Organization Pattern

```
src/
├── components/          # UI components
│   ├── ComponentName/
│   │   ├── index.tsx                  # Barrel export
│   │   ├── ComponentName.tsx          # UI component (presentation)
│   │   ├── useComponentName.ts        # Custom hook (business logic)
│   │   ├── ComponentName.module.css   # Styles
│   │   ├── utils.ts                   # Component-specific utilities (optional)
│   │   └── __tests__/
│   │       └── ComponentName.test.tsx
├── services/           # Business logic
│   ├── api/
│   │   ├── index.ts           # Public API
│   │   ├── client.ts          # HTTP client
│   │   ├── stream.ts          # Stream processing
│   │   └── __tests__/
├── utils/              # Shared utilities
│   ├── index.ts
│   ├── id.ts
│   └── __tests__/
├── types/              # Type definitions
│   └── index.ts
└── config/             # Configuration
    └── constants.ts
```

### Component Structure Pattern (MANDATORY)

**All React components MUST follow this structure:**

```
ComponentName/
├── index.tsx                    # Barrel export only
├── ComponentName.tsx            # UI/Presentation layer
├── useComponentName.ts          # Business logic & state management
├── ComponentName.module.css     # Styles
└── utils.ts (optional)          # Component-specific utilities
```

**Example:**
```typescript
// index.tsx - Barrel export
export { default } from './ComponentName';
export { useComponentName } from './useComponentName';

// ComponentName.tsx - UI only
import { useComponentName } from './useComponentName';
const ComponentName = ({ prop1, prop2 }) => {
  const { state, handlers } = useComponentName({ prop1, prop2 });
  return <div>...</div>;
};

// useComponentName.ts - Logic only
export function useComponentName({ prop1, prop2 }) {
  const [state, setState] = useState();
  const handler = useCallback(() => {...}, []);
  return { state, handler };
}
```

**Benefits:**
- Clear separation of concerns (UI vs Logic)
- Easy to test each part independently
- Reusable hooks across components
- Consistent codebase structure
- Better maintainability

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Application                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Configuration Provider                      │  │
│  │  - Load config.json                                   │  │
│  │  - Merge with environment variables                   │  │
│  │  - Provide config to components                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                 │
│                            ▼                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              ChatInterface Component                   │  │
│  │  ┌─────────────────┐  ┌──────────────────────────┐   │  │
│  │  │  MessageList    │  │    InputArea             │   │  │
│  │  │  - User msgs    │  │    - Text input          │   │  │
│  │  │  - Agent msgs   │  │    - File upload         │   │  │
│  │  │  - Progress     │  │    - Submit button       │   │  │
│  │  └─────────────────┘  └──────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                 │
│                            ▼                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           State Management (React Hooks)              │  │
│  │  - messages: Message[]                                │  │
│  │  - isStreaming: boolean                               │  │
│  │  - error: string | null                               │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                 │
│                            ▼                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              API Service Layer                        │  │
│  │  - submitReview()                                     │  │
│  │  - parseNDJSONStream()                                │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
                ┌────────────────────────┐
                │   Backend REST API     │
                │   POST /api/v1/review  │
                │   Returns: NDJSON      │
                └────────────────────────┘
```

### Technology Stack

- **React 18.2**: UI framework with hooks for state management
- **TypeScript**: Type safety for API contracts and component props
- **Axios**: HTTP client for API requests (already in dependencies)
- **CSS Modules or Styled Components**: Component-scoped styling
- **Fetch API**: Native browser API for streaming responses

### Configuration and Customization

The interface will be designed as a generic, reusable component that can be configured for different use cases beyond system design review. Configuration will be externalized through:

1. **Environment Variables**: API endpoints, feature flags
2. **Configuration File**: UI text, labels, placeholders
3. **Props**: Component-level customization

```typescript
interface AppConfig {
  branding: {
    title: string;
    subtitle: string;
    logo?: string;
  };
  ui: {
    inputPlaceholder: string;
    submitButtonText: string;
    fileUploadText: string;
    emptyStateMessage: string;
  };
  api: {
    baseUrl: string;
    reviewEndpoint: string;
  };
  features: {
    fileUpload: boolean;
    maxFileSizeMB: number;
    acceptedFileTypes: string[];
  };
}
```

## Components and Interfaces

### Core Components

#### 1. ChatInterface (Main Container)

The root component that orchestrates the chat experience. Designed to be generic and configurable for various use cases.

**Props:**
```typescript
interface ChatInterfaceProps {
  config?: Partial<AppConfig>; // Optional configuration override
  onSessionStart?: () => void;
  onSessionComplete?: (correlationId: string) => void;
}
```

**State:**
```typescript
interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  error: string | null;
  currentCorrelationId: string | null;
}
```

**Responsibilities:**
- Manage overall chat state
- Coordinate between MessageList and InputArea
- Handle API communication
- Process incoming event streams

#### 2. MessageList

Displays the conversation history with auto-scrolling.

**Props:**
```typescript
interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
}
```

**Responsibilities:**
- Render message bubbles in chronological order
- Auto-scroll to latest message
- Maintain scroll position when user scrolls up
- Display loading indicators during streaming

#### 3. MessageBubble

Renders individual messages with appropriate styling.

**Props:**
```typescript
interface MessageBubbleProps {
  message: Message;
}
```

**Responsibilities:**
- Display message content with appropriate formatting
- Apply visual styling based on message type
- Show agent name and timestamp
- Render animated indicators for "thinking" states
- Format report content with proper structure

#### 4. InputArea

Handles user input and file uploads.

**Props:**
```typescript
interface InputAreaProps {
  onSubmit: (content: string) => void;
  disabled: boolean;
}
```

**State:**
```typescript
interface InputState {
  inputValue: string;
  isDragging: boolean;
}
```

**Responsibilities:**
- Provide text input for design documents
- Handle file uploads and drag-and-drop
- Validate file size and format
- Disable input during active streaming
- Clear input after submission

#### 5. FileUploader

Manages file selection and content reading.

**Props:**
```typescript
interface FileUploaderProps {
  onFileLoad: (content: string, filename: string) => void;
  acceptedFormats: string[];
  maxSizeBytes: number;
}
```

**Responsibilities:**
- Handle file selection via button or drag-and-drop
- Read file content as text
- Validate file type and size
- Display upload status and errors

## Data Models

### Message Type

```typescript
enum MessageType {
  USER = 'user',
  AGENT_THINKING = 'agent_thinking',
  AGENT_RESULT = 'agent_result',
  SYSTEM_COMPLETE = 'system_complete',
  ERROR = 'error'
}

interface Message {
  id: string;
  type: MessageType;
  content: string;
  timestamp: Date;
  agent?: string;
  report?: ReviewReport;
  correlationId?: string;
}
```

### API Response Types

```typescript
interface ReviewResponse {
  agent?: string;
  message_type?: string;
  status?: string;
  message?: string;
  report?: ReviewReport;
}

interface ReviewReport {
  // Structure based on backend schema
  [key: string]: any;
}

interface ErrorResponse {
  success: boolean;
  status_code: number;
  message: string;
  error_type: string;
  feedback?: string;
}
```

### API Service Interface

```typescript
interface ReviewApiService {
  submitReview(designDoc: string): Promise<ReadableStream<Uint8Array>>;
  parseNDJSONStream(
    stream: ReadableStream<Uint8Array>,
    onEvent: (event: ReviewResponse) => void,
    onError: (error: Error) => void,
    onComplete: () => void
  ): Promise<void>;
}
```

## Error Handling

### Error Categories

1. **Network Errors**: Connection failures, timeouts
2. **API Errors**: 4xx/5xx responses from backend
3. **Stream Errors**: Malformed NDJSON, connection drops
4. **Validation Errors**: Invalid file formats, size limits

### Error Handling Strategy

```typescript
class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorType?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Error handling in ChatInterface
const handleError = (error: Error) => {
  console.error('Chat error:', error);
  
  let userMessage: string;
  
  if (error instanceof ApiError) {
    userMessage = error.message;
  } else if (error.message.includes('network')) {
    userMessage = 'Unable to connect to the server. Please check your connection.';
  } else {
    userMessage = 'An unexpected error occurred. Please try again.';
  }
  
  setMessages(prev => [...prev, {
    id: generateId(),
    type: MessageType.ERROR,
    content: userMessage,
    timestamp: new Date()
  }]);
  
  setIsStreaming(false);
};
```

### Retry Mechanism

```typescript
interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
}

const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2
};
```

## Testing Strategy

### Unit Tests

**Components to Test:**
- MessageBubble: Rendering different message types
- InputArea: Input validation, file handling
- FileUploader: File reading, size validation
- API Service: NDJSON parsing, error handling

**Test Framework:** Jest + React Testing Library

**Example Test Cases:**
```typescript
describe('MessageBubble', () => {
  it('renders user message with correct styling', () => {});
  it('displays agent name for agent messages', () => {});
  it('shows animated indicator for thinking state', () => {});
  it('formats report content correctly', () => {});
});

describe('InputArea', () => {
  it('disables input during streaming', () => {});
  it('calls onSubmit with input value', () => {});
  it('clears input after submission', () => {});
});

describe('FileUploader', () => {
  it('rejects files larger than max size', () => {});
  it('accepts valid file formats', () => {});
  it('reads file content correctly', () => {});
});
```

### Integration Tests

**Scenarios:**
1. Submit design document and receive event stream
2. Handle connection errors gracefully
3. Display multiple review sessions in sequence
4. Upload file and submit for review

### Manual Testing Checklist

- [ ] Submit text design document
- [ ] Upload file (.txt, .md, .json)
- [ ] Verify real-time event display
- [ ] Test error scenarios (network failure, invalid input)
- [ ] Verify responsive layout on different screen sizes
- [ ] Test auto-scroll behavior
- [ ] Verify message history persistence during session
- [ ] Test accessibility with keyboard navigation

## Implementation Details

### Configuration Management

The application will load configuration from multiple sources with the following precedence:

1. **Default Configuration** (lowest priority)
2. **config.json** file in public directory
3. **Environment Variables** (highest priority)

```typescript
// config/defaultConfig.ts
export const defaultConfig: AppConfig = {
  branding: {
    title: 'AI Assistant',
    subtitle: 'Powered by intelligent agents',
  },
  ui: {
    inputPlaceholder: 'Enter your content here...',
    submitButtonText: 'Submit',
    fileUploadText: 'Upload File',
    emptyStateMessage: 'Start a conversation by submitting content',
  },
  api: {
    baseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000',
    reviewEndpoint: '/api/v1/review',
  },
  features: {
    fileUpload: true,
    maxFileSizeMB: 1,
    acceptedFileTypes: ['.txt', '.md', '.json'],
  },
};

// config/configLoader.ts
export async function loadConfig(): Promise<AppConfig> {
  try {
    const response = await fetch('/config.json');
    const fileConfig = await response.json();
    return mergeConfig(defaultConfig, fileConfig);
  } catch (error) {
    console.warn('Failed to load config.json, using defaults');
    return defaultConfig;
  }
}

function mergeConfig(defaults: AppConfig, overrides: Partial<AppConfig>): AppConfig {
  return {
    branding: { ...defaults.branding, ...overrides.branding },
    ui: { ...defaults.ui, ...overrides.ui },
    api: { ...defaults.api, ...overrides.api },
    features: { ...defaults.features, ...overrides.features },
  };
}
```

### Example config.json for System Design Use Case

```json
{
  "branding": {
    "title": "System Design Mentor",
    "subtitle": "AI-powered architecture analysis and recommendations"
  },
  "ui": {
    "inputPlaceholder": "Paste your design document here or upload a file...",
    "submitButtonText": "Review Design",
    "fileUploadText": "Upload Design Document",
    "emptyStateMessage": "Submit a design document to receive architectural analysis"
  }
}
```

### NDJSON Stream Processing

```typescript
async function parseNDJSONStream(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: ReviewResponse) => void,
  onError: (error: Error) => void,
  onComplete: () => void
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        onComplete();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Keep the last incomplete line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const event = JSON.parse(line);
            onEvent(event);
          } catch (parseError) {
            console.error('Failed to parse NDJSON line:', line, parseError);
          }
        }
      }
    }
  } catch (error) {
    onError(error as Error);
  } finally {
    reader.releaseLock();
  }
}
```

### Event-to-Message Transformation

```typescript
function transformEventToMessage(event: ReviewResponse, correlationId: string): Message {
  const baseMessage = {
    id: generateId(),
    timestamp: new Date(),
    correlationId
  };

  if (event.message_type === 'thinking') {
    return {
      ...baseMessage,
      type: MessageType.AGENT_THINKING,
      content: event.message || 'Thinking...',
      agent: event.agent
    };
  }

  if (event.message_type === 'result') {
    return {
      ...baseMessage,
      type: MessageType.AGENT_RESULT,
      content: event.message || 'Task completed',
      agent: event.agent,
      report: event.report
    };
  }

  if (event.status === 'complete') {
    return {
      ...baseMessage,
      type: MessageType.SYSTEM_COMPLETE,
      content: event.message || 'Review complete'
    };
  }

  return {
    ...baseMessage,
    type: MessageType.ERROR,
    content: 'Unknown event type'
  };
}
```

### Auto-Scroll Logic

```typescript
const MessageList: React.FC<MessageListProps> = ({ messages, isStreaming }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (autoScroll) {
      scrollToBottom();
    }
  }, [messages, autoScroll]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    setAutoScroll(isAtBottom);
  };

  return (
    <div 
      ref={containerRef} 
      onScroll={handleScroll}
      className="message-list"
    >
      {messages.map(msg => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};
```

### Responsive Design Breakpoints

```css
/* Mobile: < 768px */
@media (max-width: 767px) {
  .chat-interface {
    flex-direction: column;
    padding: 1rem;
  }
  
  .message-bubble {
    max-width: 90%;
    font-size: 14px;
  }
  
  .input-area {
    position: fixed;
    bottom: 0;
    width: 100%;
  }
}

/* Tablet: 768px - 1024px */
@media (min-width: 768px) and (max-width: 1024px) {
  .chat-interface {
    padding: 1.5rem;
  }
  
  .message-bubble {
    max-width: 80%;
  }
}

/* Desktop: > 1024px */
@media (min-width: 1025px) {
  .chat-interface {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  .message-bubble {
    max-width: 70%;
  }
}
```

## Visual Design Specifications

### Message Bubble Styling

```typescript
const messageStyles = {
  user: {
    backgroundColor: '#007bff',
    color: '#ffffff',
    alignSelf: 'flex-end',
    borderRadius: '18px 18px 4px 18px'
  },
  agent_thinking: {
    backgroundColor: '#f8f9fa',
    color: '#495057',
    alignSelf: 'flex-start',
    borderRadius: '18px 18px 18px 4px',
    border: '1px solid #dee2e6'
  },
  agent_result: {
    backgroundColor: '#e7f3ff',
    color: '#004085',
    alignSelf: 'flex-start',
    borderRadius: '18px 18px 18px 4px',
    border: '1px solid #b8daff'
  },
  system_complete: {
    backgroundColor: '#d4edda',
    color: '#155724',
    alignSelf: 'center',
    borderRadius: '18px',
    border: '1px solid #c3e6cb'
  },
  error: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    alignSelf: 'center',
    borderRadius: '18px',
    border: '1px solid #f5c6cb'
  }
};
```

### Animation for Thinking State

```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.thinking-indicator {
  display: inline-flex;
  gap: 4px;
}

.thinking-indicator span {
  width: 8px;
  height: 8px;
  background-color: #6c757d;
  border-radius: 50%;
  animation: pulse 1.4s infinite;
}

.thinking-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.thinking-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}
```

## Performance Considerations

1. **Message Virtualization**: For long conversations (>100 messages), implement virtual scrolling using react-window
2. **Debounced Scroll Handling**: Debounce scroll event handlers to reduce re-renders
3. **Memoization**: Use React.memo for MessageBubble to prevent unnecessary re-renders
4. **Stream Buffering**: Process NDJSON events in batches to reduce state updates

## Accessibility

1. **ARIA Labels**: Add appropriate aria-labels to interactive elements
2. **Keyboard Navigation**: Ensure all functionality is accessible via keyboard
3. **Screen Reader Support**: Use semantic HTML and ARIA live regions for dynamic content
4. **Focus Management**: Maintain logical focus order and visible focus indicators
5. **Color Contrast**: Ensure all text meets WCAG AA standards (4.5:1 ratio)

## Security Considerations

1. **Input Sanitization**: Sanitize user input before display to prevent XSS
2. **File Upload Validation**: Strictly validate file types and sizes
3. **CORS Configuration**: Ensure backend CORS settings allow frontend origin
4. **Content Security Policy**: Implement CSP headers to prevent injection attacks
