import { useState, useEffect } from 'react';

interface UseMessageBubbleProps {
  hasReport: boolean;
  isLatestResult: boolean;
}

export function useMessageBubble({ hasReport, isLatestResult }: UseMessageBubbleProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    if (!hasReport) return true; // Always show thinking messages
    return isLatestResult;       // For results, only expand if latest
  });

  // Sync expanded state when isLatestResult changes (e.g. a newer result arrives)
  useEffect(() => {
    if (hasReport) {
      setIsExpanded(isLatestResult);
    }
  }, [isLatestResult, hasReport]);

  const toggleExpanded = () => setIsExpanded((prev) => !prev);

  return { isExpanded, toggleExpanded };
}
