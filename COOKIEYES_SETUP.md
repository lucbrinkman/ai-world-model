# CookieYes Setup Guide

## Step 1: Create CookieYes Account

1. Go to https://www.cookieyes.com
2. Sign up for a free account (free up to 25,000 pageviews/month)
3. Verify your email

## Step 2: Create Your Cookie Banner

1. In the CookieYes dashboard, click "Add Website"
2. Enter your domain (for development, you can use `localhost`)
3. Choose "Cookie Banner" as the solution type

## Step 3: Configure Cookie Categories

CookieYes will scan your site. Configure the following categories:

### Essential Cookies (Always On)
- **Supabase Authentication Cookies**
  - Description: "Required for user authentication and account functionality"
  - These cannot be disabled

### Analytics Cookies (Optional)
- **PostHog Analytics**
  - Custom description (recommended):
    ```
    We use privacy-focused analytics to understand how people think about
    AI futures and improve the tool. This helps us support AI safety research.
    No marketing tracking, no personal data sold.
    ```
  - Cookie: PostHog sets cookies like `ph_*`
  - Add PostHog domain: `eu.i.posthog.com`

## Step 4: Customize Banner Text

Navigate to "Appearance" in CookieYes dashboard:

### Banner Message (Recommended Text):
```
We care about your privacy and AI safety research. We use cookies for
essential site functionality and anonymous analytics to improve how we
help people explore AI futures. No marketing, no tracking, no selling data.
```

### Accept Button Text:
```
Accept All
```

### Settings Button Text:
```
Cookie Settings
```

## Step 5: Configure Geolocation

In CookieYes settings:
1. Enable "Geo-location targeting"
2. Set to show banner only in: **EU/EEA, UK** (GDPR regions)
3. For other regions: Set to "Automatically accept cookies"

This ensures:
- EU users see the banner and must consent
- US users (and other non-GDPR regions) get analytics automatically
- You remain compliant everywhere

## Step 6: Get Your Site ID

1. In the CookieYes dashboard, go to "Install Cookie Banner"
2. You'll see a script tag that looks like:
   ```html
   <script id="cookieyes" type="text/javascript"
     src="https://cdn-cookieyes.com/client_data/XXXXXXXXXXXXXXX/script.js">
   </script>
   ```
3. Copy the ID part (the X's) from the URL

## Step 7: Add to Your .env.local

Add this line to your `.env.local` file:
```
NEXT_PUBLIC_COOKIEYES_ID=your-actual-id-here
```

## Step 8: Restart Dev Server

```bash
# Stop the server (Ctrl+C) and restart
npm run dev
```

## Step 9: Test It

1. Open http://localhost:3000
2. You should see the CookieYes banner (if configured to show in all regions for testing)
3. Try accepting and declining to verify it works
4. Clear your browser cookies to test again

## Step 10: Final Configuration

Before deploying to production:

1. **Update domain** in CookieYes dashboard to your actual domain
2. **Enable geolocation** to only show in GDPR regions
3. **Review privacy policy** link in banner points to `/privacy`
4. **Test from different regions** if possible (or use VPN)

## Integration with PostHog

CookieYes will automatically:
- Block PostHog cookies until user consents
- Call PostHog's opt-in/opt-out when user accepts/declines
- Remember user's choice

## Customization Tips for AI Safety Alignment

In the CookieYes dashboard, emphasize:
- **Transparency**: "We only use cookies for essential functions and anonymous analytics"
- **Purpose**: "Help us improve AI safety research and education"
- **No marketing**: "We never use marketing cookies or sell your data"
- **Privacy-first**: "Analytics data stored in EU, privacy-focused tools only"

This messaging can increase acceptance rates while maintaining trust.
