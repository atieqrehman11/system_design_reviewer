/**
 * Handles follow-up chat streaming after a review completes.
 * Owns no message state — receives setters from the composing hook.
 */
import { useCallback } from 'react';
import type React from 'react';
import type { Message, ChatMessage } from '../../types/core';
import { MessageType } from '../../types/core';
import { generateMessageId } from '../../utils/id';
import { submitChat } from '../../services/chatClient';
import type { ChatUIConfig } from '../../config/ChatUIConfig';
import { drainChatStream, type ChatStreamCallbacks } from './chatStreamUtils';

function applyChunkToMessage(
  prev: Message[],
  msgId: string,
  snapshot: string,
): Message[] {
  return prev.map((m): Message =>
    m.id === msgId ? { ...m, type: MessageType.AGENT_RESULT, content: snapshot } : m,
  );
}

function applyErrorToMessage(
  prev: Message[],
  msgId: string,
  errorText: string,
): Message[] {
  return prev.map((m): Message =>
    m.id === msgId ? { ...m, type: MessageType.ERROR, content: errorText } : m,
  );
}

function makeChatStreamCallbacks(
  assistantMsgId: string,
  chatHistoryRef: React.MutableRefObject<ChatMessage[]>,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
): ChatStreamCallbacks {
  return {
    onChunk: (snapshot) => {
      setMessages((prev) => applyChunkToMessage(prev, assistantMsgId, snapshot));
    },
    onHistoryUpdate: (reply) => {
      chatHistoryRef.current = [...chatHistoryRef.current, { role: 'assistant', content: reply }];
    },
  };
}

export interface UseChatStreamDeps {
  config: ChatUIConfig;
  chatHistoryRef: React.MutableRefObject<ChatMessage[]>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useChatStream(deps: UseChatStreamDeps) {
  const { config, chatHistoryRef, setMessages, setIsStreaming } = deps;

  // Empty dep array is intentional: all deps are stable state setters or refs.
  const startChat = useCallback(
    (content: string, correlationId: string) => {
      chatHistoryRef.current = [...chatHistoryRef.current, { role: 'user', content }];

      const assistantMsgId = generateMessageId();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          type: MessageType.AGENT_THINKING,
          content: '',
          agent: config.assistantName,
          timestamp: new Date(),
          correlationId,
        },
      ]);

      const chatApiUrl = `${config.apiBaseUrl}${config.chatEndpoint}`;

      const run = async (): Promise<void> => {
        try {
          const stream = await submitChat(
            correlationId,
            chatHistoryRef.current,
            chatApiUrl,
            { timeout: 30000 },
            config.buildChatRequestBody,
          );
          const callbacks = makeChatStreamCallbacks(assistantMsgId, chatHistoryRef, setMessages);
          await drainChatStream(stream, callbacks);
          setIsStreaming(false);
        } catch (err) {
          console.error('Chat error:', err);
          const msg = err instanceof Error ? err.message : 'Failed to get a response. Please try again.';
          // Show error inline in the message bubble only — no redundant banner
          setMessages((prev) => applyErrorToMessage(prev, assistantMsgId, msg));
          setIsStreaming(false);
        }
      };

      run().catch((err) => {
        console.error('Unhandled chat error:', err);
        setIsStreaming(false);
      });
    },
    // Empty dep array is safe: config is stable at mount; setters/refs never change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { startChat };
}
