# Supabase Setup Guide

This guide will help you set up Supabase authentication and database for the AI World Model application.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Node.js and npm installed

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in the project details:
   - Name: AI World Model (or your preferred name)
   - Database Password: Choose a strong password
   - Region: Select the region closest to your users
4. Click "Create new project"
5. Wait for the project to be provisioned (this may take a few minutes)

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, click on the "Settings" icon (gear icon)
2. Navigate to "API" in the left sidebar
3. You'll need two values:
   - **Project URL** (under "Project URL")
   - **Anon/Public Key** (under "Project API keys" - the `anon` `public` key)

## Step 3: Configure Environment Variables

1. Open `.env.local` in the project root
2. Replace the placeholder values with your actual Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Important:** Never commit `.env.local` to version control. It's already in `.gitignore`.

## Step 4: Run the Database Migration

1. In your Supabase project dashboard, click on the "SQL Editor" icon
2. Click "New query"
3. Copy the contents of `supabase/migrations/001_create_saved_scenarios.sql`
4. Paste it into the SQL editor
5. Click "Run" or press `Ctrl+Enter` (or `Cmd+Enter` on Mac)
6. Verify that the query executed successfully

This migration will:
- Create the `saved_scenarios` table
- Set up Row Level Security (RLS) policies
- Create indexes for better performance
- Set up automatic timestamp updates

## Step 5: Configure Authentication

### Enable Email Authentication

1. In your Supabase project dashboard, go to "Authentication" → "Providers"
2. Make sure "Email" is enabled (it should be by default)
3. Configure email templates if desired (optional):
   - Go to "Authentication" → "Email Templates"
   - Customize the confirmation email, reset password email, etc.

### Configure Email Settings (Optional)

By default, Supabase uses their email service. For production, you may want to configure your own SMTP server:

1. Go to "Project Settings" → "Auth"
2. Scroll down to "SMTP Settings"
3. Configure your SMTP provider details

### Set Up Redirect URLs

1. Go to "Authentication" → "URL Configuration"
2. Add your application URL to "Site URL" (e.g., `http://localhost:3000` for local development)
3. Add redirect URLs:
   - For local development: `http://localhost:3000/auth/callback`
   - For production: `https://yourdomain.com/auth/callback`

## Step 6: Test the Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:3000 in your browser

4. Test authentication:
   - Click "Sign In / Sign Up"
   - Create a new account
   - Check your email for the confirmation link
   - Click the confirmation link
   - You should be redirected back to the app and signed in

5. Test saving scenarios:
   - Adjust some probability sliders
   - Click "Save Scenario"
   - Enter a name and save
   - Verify the scenario appears in the "Saved Scenarios" list

6. Test loading scenarios:
   - Click on a saved scenario to load it
   - Verify the sliders update to match the saved values

7. Test data export and deletion:
   - Click "Profile"
   - Test "Download My Data" - should download a JSON file
   - Test "Delete Account" (use a test account!)

## Troubleshooting

### "Invalid API key" error
- Verify your `.env.local` file has the correct credentials
- Make sure you're using the `anon` public key, not the `service_role` key
- Restart your development server after changing `.env.local`

### Email confirmation not working
- Check your spam/junk folder
- Verify your redirect URLs are configured correctly in Supabase
- For local development, you can disable email confirmation in Supabase:
  - Go to "Authentication" → "Providers" → "Email"
  - Toggle off "Confirm email"

### RLS policies not working
- Verify the migration ran successfully
- Check the "Table Editor" in Supabase to see if RLS is enabled
- Look at the "Authentication" → "Policies" tab to verify policies exist

### Database connection errors
- Verify your Supabase project is active (not paused)
- Check that your database password is correct
- Ensure your IP is not blocked (Supabase has no IP restrictions by default)

## Security Notes

1. **Never expose your `service_role` key** - it bypasses RLS and should only be used server-side
2. **Use Row Level Security** - The migration sets up RLS to ensure users can only access their own data
3. **HTTPS in Production** - Always use HTTPS for your production site
4. **Environment Variables** - Never commit `.env.local` to version control
5. **Regular Backups** - Supabase provides automatic backups, but consider additional backup strategies for production

## Production Deployment

When deploying to production (Vercel, Netlify, etc.):

1. Add your environment variables to your hosting platform
2. Update the Supabase redirect URLs to include your production domain
3. Consider enabling additional security features:
   - Rate limiting
   - CAPTCHA on signup
   - Email verification required
4. Set up monitoring and alerts
5. Review and update the Privacy Policy with your contact information

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
