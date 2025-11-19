'use client';

import { useState, useEffect } from 'react';
import { X, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { sendFeedback } from '@/lib/actions/feedback';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userName?: string;
}

export function FeedbackModal({ isOpen, onClose, userEmail, userName }: FeedbackModalProps) {
  const [category, setCategory] = useState<'bug' | 'feature' | 'general'>('general');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Pre-fill email if user is authenticated
  useEffect(() => {
    if (userEmail) {
      setEmail(userEmail);
    }
  }, [userEmail]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Delay reset to avoid visual glitch
      setTimeout(() => {
        setMessage('');
        setCategory('general');
        if (!userEmail) setEmail('');
        setSubmitStatus('idle');
        setErrorMessage('');
      }, 200);
    }
  }, [isOpen, userEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      setErrorMessage('Please enter your feedback');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const result = await sendFeedback({
        category,
        message: message.trim(),
        userEmail: email.trim() || undefined,
        userName: userName || undefined,
      });

      if (result.success) {
        setSubmitStatus('success');
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setSubmitStatus('error');
        setErrorMessage(result.error || 'Failed to send feedback');
      }
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#1a1625] border-2 border-purple-500/30 rounded-lg shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-white">Send Feedback</h2>
            <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">
              Early Beta
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Success State */}
        {submitStatus === 'success' ? (
          <div className="p-8 text-center">
            <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold text-white mb-2">Thank you!</h3>
            <p className="text-gray-400">Your feedback has been sent successfully.</p>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                What type of feedback?
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as 'bug' | 'feature' | 'general')}
                className="w-full px-3 py-2 bg-[#0C0A16] border border-purple-500/30 rounded text-white focus:outline-none focus:border-purple-500"
              >
                <option value="general">💬 General Feedback</option>
                <option value="bug">🐛 Bug Report</option>
                <option value="feature">💡 Feature Request</option>
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your feedback <span className="text-red-400">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what you think..."
                className="w-full px-3 py-2 bg-[#0C0A16] border border-purple-500/30 rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                rows={6}
                maxLength={5000}
                required
              />
              <div className="text-xs text-gray-500 mt-1 text-right">
                {message.length}/5000
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your email {!userEmail && <span className="text-gray-500 text-xs">(optional)</span>}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={!!userEmail}
                className="w-full px-3 py-2 bg-[#0C0A16] border border-purple-500/30 rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {!userEmail && (
                <p className="text-xs text-gray-500 mt-1">
                  Optional, but we can&apos;t reply without it
                </p>
              )}
            </div>

            {/* Error Message */}
            {submitStatus === 'error' && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !message.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Send Feedback
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
