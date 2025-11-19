# Feedback Form Setup

This document explains how to set up the feedback form to send emails.

## Overview

The feedback form uses [Resend](https://resend.com/) to send emails to luc.m.brinkman@gmail.com when users submit feedback.

## Setup Instructions

### 1. Create a Resend Account

1. Go to [resend.com](https://resend.com/)
2. Sign up for a free account (100 emails/day free tier)
3. Verify your email address

### 2. Get Your API Key

1. Log in to your Resend dashboard
2. Go to **API Keys** section
3. Click **Create API Key**
4. Give it a name (e.g., "AI Futures Feedback")
5. Copy the API key (starts with `re_`)

### 3. Add API Key to Environment Variables

Add the following to your `.env.local` file:

```bash
RESEND_API_KEY=re_your_api_key_here
```

**Important:** This key should **never** be committed to version control.

### 4. Restart the Development Server

After adding the environment variable, restart your dev server:

```bash
npm run dev
```

## Testing

1. Click the purple "Feedback" button in the bottom-right corner
2. Fill out the form and submit
3. Check luc.m.brinkman@gmail.com for the feedback email

## Features

- ✅ Prominent floating button with "Beta" badge
- ✅ Category selection (Bug Report, Feature Request, General Feedback)
- ✅ Pre-filled email for authenticated users
- ✅ Optional email field for anonymous users
- ✅ Character counter (5000 char limit)
- ✅ Success/error states with clear feedback
- ✅ Responsive design
- ✅ Your email address is only in server-side code (never exposed to client)

## Rate Limits

- Free tier: 100 emails/day
- If you need more, Resend has paid plans

## Custom Domain (Optional)

For production, you may want to set up a custom sending domain in Resend:

1. Add your domain in the Resend dashboard
2. Add the required DNS records
3. Update the `from` field in `lib/actions/feedback.ts` to use your domain

Currently using Resend's test domain: `feedback@resend.dev`
