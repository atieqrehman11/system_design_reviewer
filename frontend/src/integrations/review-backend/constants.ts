/**
 * Review-backend integration config.
 * All values — including assistantName — are sourced from src/config/constants.ts
 * and its REACT_APP_* env vars. No overrides needed here.
 */
import { createDefaultChatUIConfig } from '../../core/config/ChatUIConfig';
import type { ChatUIConfig } from '../../core/config/ChatUIConfig';

/**
 * Pre-built ChatUIConfig for the system-design-reviewer backend.
 * Instantiated once at module load — stable reference, safe to pass as a prop.
 * Configure via REACT_APP_* environment variables — see frontend/.env.example.
 */
export const reviewChatUIConfig: ChatUIConfig = createDefaultChatUIConfig();
