import React, { useState, useCallback } from 'react';
import { copyToClipboard } from '../../utils/clipboard';
import styles from './CopyButton.module.css';

interface CopyButtonProps {
  text: string;
  className?: string;
}

const CopyIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const COPIED_RESET_MS = 2000;

const CopyButton: React.FC<CopyButtonProps> = ({ text, className }) => {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    copyToClipboard(text).then((success) => {
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), COPIED_RESET_MS);
      }
    }).catch(() => {
      // Clipboard write failed — silently ignore, no UI change needed
      console.error('Failed to copy to clipboard');
    });
  }, [text]);

  return (
    <button
      type="button"
      className={[styles.copyButton, className].filter(Boolean).join(' ')}
      onClick={handleClick}
      aria-label={copied ? 'Copied' : 'Copy to clipboard'}
      title={copied ? 'Copied!' : 'Copy'}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
};

export default CopyButton;
