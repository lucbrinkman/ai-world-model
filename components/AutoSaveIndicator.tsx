'use client'

import { useEffect, useState } from 'react';
import { SaveStatus } from '@/lib/autoSave';

interface AutoSaveIndicatorProps {
  saveStatus: SaveStatus;
  isAuthenticated: boolean;
  error: string | null;
  lastSavedAt: Date | null;
  onSignInClick?: () => void;
}

export default function AutoSaveIndicator({
  saveStatus,
  isAuthenticated,
  error,
  lastSavedAt,
  onSignInClick,
}: AutoSaveIndicatorProps) {
  const [, setTick] = useState(0);

  // Update the display every minute to keep relative time fresh
  useEffect(() => {
    if (!isAuthenticated || !lastSavedAt) return;

    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isAuthenticated, lastSavedAt]);

  // Helper to get relative time string
  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) {
      return 'Saved to cloud';
    } else if (diffMinutes === 1) {
      return 'Saved 1 minute ago';
    } else {
      return `Saved ${diffMinutes} minutes ago`;
    }
  };

  // Anonymous users always show "Sign in to save"
  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={onSignInClick}
          className="text-purple-500 hover:text-purple-400 transition-colors"
        >
          Sign in to save
        </button>
      </div>
    );
  }

  // Authenticated users show cloud save status
  if (error) {
    return (
      <div className="text-sm text-red-400">
        Error: {error}
      </div>
    );
  }

  if (saveStatus === 'saving') {
    return (
      <div className="text-sm text-gray-400">
        Saving...
      </div>
    );
  }

  if (lastSavedAt) {
    return (
      <div className="text-sm text-gray-400">
        {getRelativeTime(lastSavedAt)}
      </div>
    );
  }

  return null;
}
