'use server';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface FeedbackData {
  category: 'bug' | 'feature' | 'general';
  message: string;
  userEmail?: string;
  userName?: string;
}

export async function sendFeedback(data: FeedbackData) {
  try {
    // Validate input
    if (!data.message || data.message.trim().length === 0) {
      return { success: false, error: 'Feedback message is required' };
    }

    if (data.message.length > 5000) {
      return { success: false, error: 'Feedback message is too long (max 5000 characters)' };
    }

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return { success: false, error: 'Email service is not configured. Please contact support.' };
    }

    // Format category for display
    const categoryLabels = {
      bug: '🐛 Bug Report',
      feature: '💡 Feature Request',
      general: '💬 General Feedback',
    };

    // Build email HTML
    const emailHtml = `
      <h2>${categoryLabels[data.category]}</h2>
      <p><strong>Message:</strong></p>
      <p style="white-space: pre-wrap;">${data.message}</p>
      <hr />
      <p><strong>From:</strong> ${data.userName || 'Anonymous User'}</p>
      ${data.userEmail ? `<p><strong>Reply to:</strong> ${data.userEmail}</p>` : '<p><em>No email provided</em></p>'}
      <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
    `;

    // Send email via Resend
    const result = await resend.emails.send({
      from: 'AI Futures Feedback <feedback@resend.dev>', // Resend's test domain
      to: 'luc.m.brinkman@gmail.com',
      replyTo: data.userEmail || undefined,
      subject: `[AI Futures] ${categoryLabels[data.category]}`,
      html: emailHtml,
    });

    if (result.error) {
      console.error('Resend error:', result.error);
      return { success: false, error: 'Failed to send feedback. Please try again.' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending feedback:', error);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}
