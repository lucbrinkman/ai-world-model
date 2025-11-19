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
      {/* Floating Feedback Button */}
      <div className="absolute bottom-10 left-6 z-40">
        <button
          onClick={() => setIsModalOpen(true)}
          className="relative flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
          aria-label="Send feedback"
        >
          {/* Badge on top-right corner - inside button */}
          <span className="absolute -top-3 -right-2 px-2.5 py-1 text-[11px] font-bold bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full shadow-md border-2 border-background pointer-events-none">
            OPEN BETA
          </span>

          <MessageSquare size={20} className="group-hover:rotate-12 transition-transform" />
          <span className="hidden sm:inline">Feedback</span>
        </button>
      </div>

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
