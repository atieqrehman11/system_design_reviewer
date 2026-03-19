import { useState, useCallback, useEffect } from 'react';

interface UseMessageBubbleProps {
  hasReport: boolean;
  isLatestResult: boolean;
}

interface UseMessageBubbleReturn {
  isExpanded: boolean;
  toggleExpanded: () => void;
}

/**
 * Manages expand/collapse state for a message bubble.
 * Non-report messages are always expanded; report messages expand only when latest.
 */
export function useMessageBubble({
  hasReport,
  isLatestResult,
}: UseMessageBubbleProps): UseMessageBubbleReturn {
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    if (!hasReport) return true;   // Always show non-report messages
    return isLatestResult;         // For results, only expand if latest
  });

  // Sync expanded state when isLatestResult changes (e.g. a newer result arrives)
  useEffect(() => {
    if (hasReport) {
      setIsExpanded(isLatestResult);
    }
  }, [isLatestResult, hasReport]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return { isExpanded, toggleExpanded };
}
