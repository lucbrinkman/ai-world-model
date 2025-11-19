'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';

interface FeedbackButtonProps {
  userEmail?: string;
  userName?: string;
}

export function FeedbackButton({ userEmail, userName }: FeedbackButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 z-[9998] flex items-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 group"
        aria-label="Send feedback"
      >
        <MessageSquare size={20} className="group-hover:rotate-12 transition-transform" />
        <span className="hidden sm:inline">Feedback</span>
        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs font-bold bg-orange-500 text-white rounded-full animate-pulse">
          Beta
        </span>
      </button>

      {/* Modal */}
      <FeedbackModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userEmail={userEmail}
        userName={userName}
      />
    </>
  );
}
