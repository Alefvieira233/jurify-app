import { useEffect, useState } from 'react';

interface ScreenReaderAnnounceProps {
  /** The message to announce to screen readers. */
  message: string;
  /** Politeness level — 'assertive' interrupts the user, 'polite' waits. */
  politeness?: 'polite' | 'assertive';
}

/**
 * Announces dynamic content changes to screen readers via an aria-live region.
 * Clears then re-sets the message to force re-announcement on repeated values.
 */
export function ScreenReaderAnnounce({ message, politeness = 'polite' }: ScreenReaderAnnounceProps) {
  const [announced, setAnnounced] = useState('');

  useEffect(() => {
    // Clear then set to force re-announcement
    setAnnounced('');
    const timer = setTimeout(() => setAnnounced(message), 100);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <div
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
      role={politeness === 'assertive' ? 'alert' : 'status'}
    >
      {announced}
    </div>
  );
}
