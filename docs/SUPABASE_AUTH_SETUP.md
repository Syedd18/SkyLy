# Supabase Authentication Setup Guide

This guide will help you enable Google OAuth and Phone/SMS authentication in your Supabase project.

## Current Status

✅ **Code Implementation**: Complete
- Frontend UI with Google and Phone sign-in buttons
- OAuth callback handler at `/auth/callback`
- Backend endpoint `/api/auth/supabase-callback` for token exchange
- Auth context methods: `loginWithGoogle()`, `loginWithPhone()`, `verifyOtp()`

⚠️ **Pending Configuration**: Supabase Dashboard Setup (your action required)

---

## 1. Fix Email Rate Limit Issue (Priority 1)

**Problem**: Email authentication is hitting rate limit (429 error)

**Solution**:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/qbocxvwmzyqkerolzvhx)
2. Navigate to **Authentication** → **Providers** → **Email**
3. **Uncheck** "Confirm email" option (allows users to login immediately without email confirmation)
4. Click **Save**

> Note: Alternatively, wait ~1 hour for the rate limit to reset, but disabling confirmation is recommended for development.

---

## 2. Enable Google OAuth (Priority 2)

### Step 1: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
5. Configure consent screen if prompted (add app name, support email)
6. For **Application type**, select **Web application**
7. Add **Authorized redirect URIs**:
   ```
   https://qbocxvwmzyqkerolzvhx.supabase.co/auth/v1/callback
   ```
   For local development, also add:
   ```
   http://localhost:3000/auth/callback
   ```
8. Click **Create** and copy:
   - **Client ID**
   - **Client Secret**

### Step 2: Configure Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/qbocxvwmzyqkerolzvhx)
2. Navigate to **Authentication** → **Providers**
3. Find **Google** in the list
4. **Enable** the toggle
5. Paste your Google **Client ID** and **Client Secret**
6. Click **Save**

### Step 3: Add Redirect URL to Supabase

1. In Supabase Dashboard, go to **Authentication** → **URL Configuration**
2. Add these to **Redirect URLs**:
   ```
   http://localhost:3000/auth/callback
   https://sky-ly.vercel.app/auth/callback
   ```
3. Click **Save**

---

## 3. Enable Phone/SMS Authentication (Priority 3)

Phone authentication requires an SMS provider. Supabase supports **Twilio** and **MessageBird**.

### Option A: Twilio (Recommended)

#### Step 1: Set up Twilio Account

1. Go to [Twilio Console](https://www.twilio.com/console)
2. Sign up for a free trial account
3. Get a phone number:
   - Navigate to **Phone Numbers** → **Manage** → **Buy a number**
   - Purchase a number with SMS capability
4. Copy these credentials from the dashboard:
   - **Account SID**
   - **Auth Token**
   - **Phone Number** (e.g., +1234567890)

#### Step 2: Configure Supabase with Twilio

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/qbocxvwmzyqkerolzvhx)
2. Navigate to **Authentication** → **Providers** → **Phone**
3. **Enable** the toggle
4. Select **Twilio** as provider
5. Enter your Twilio credentials:
   - **Account SID**
   - **Auth Token**  
   - **Sender Phone Number** (your Twilio number)
6. Click **Save**

#### Step 3: Twilio Trial Limitations

⚠️ **Important**: Twilio trial accounts can only send SMS to **verified phone numbers**.

To verify a number:
1. In Twilio Console, go to **Phone Numbers** → **Manage** → **Verified Caller IDs**
2. Click **+** to add your phone number
3. Enter the verification code you receive

For production, upgrade to a paid Twilio account.

### Option B: MessageBird (Alternative)

1. Sign up at [MessageBird](https://dashboard.messagebird.com/en/sign-up)
2. Get your **API Key** from the dashboard
3. In Supabase, select **MessageBird** as provider
4. Enter your API key
5. Click **Save**

---

## 4. Testing the Setup

### Test Google OAuth:

1. Start your frontend: `cd frontend-new && npm run dev`
2. Start your backend: `cd Backend && python -m uvicorn main:app --reload`
3. Open http://localhost:3000
4. Click login/register
5. Click the **Google** button
6. You should be redirected to Google sign-in
7. After authentication, you'll be redirected to `/auth/callback` and then to home page

### Test Phone Authentication:

1. In the login modal, click the **Phone** button
2. Enter your phone number with country code (e.g., `+1234567890`)
3. Click **Send OTP**
4. You should receive a 6-digit code via SMS
5. Enter the code and click **Verify OTP**
6. You should be logged in

---

## 5. Deployment Configuration

### Vercel (Frontend)

Add these environment variables in Vercel dashboard:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://qbocxvwmzyqkerolzvhx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFib2N4dndtenlxa2Vyb2x6dmh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg3NzM5NjAsImV4cCI6MjA1NDM0OTk2MH0.D_kVQ2i8qQi_L5xvbTTVlH6H7jE7k0Qlg3WNd8B4kY8
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_KhNSzoWsm0Up7PXqkqPVMg_3RSQz51d
NEXT_PUBLIC_API_URL=https://skyly-2.onrender.com
```

Update redirect URLs in Supabase to include production URL:
```
https://sky-ly.vercel.app/auth/callback
```

### Render (Backend)

Add these environment variables in Render dashboard:

```bash
SUPABASE_URL=https://qbocxvwmzyqkerolzvhx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFib2N4dndtenlxa2Vyb2x6dmh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg3NzM5NjAsImV4cCI6MjA1NDM0OTk2MH0.D_kVQ2i8qQi_L5xvbTTVlH6H7jE7k0Qlg3WNd8B4kY8
```

---

## 6. Troubleshooting

### Google OAuth Issues:

**Error: "redirect_uri_mismatch"**
- Make sure `https://qbocxvwmzyqkerolzvhx.supabase.co/auth/v1/callback` is added to Google Cloud Console authorized redirect URIs

**Error: "Access blocked: This app's request is invalid"**
- Complete the OAuth consent screen configuration in Google Cloud Console
- Add test users if app is in testing mode

### Phone Auth Issues:

**Error: "SMS failed to send"**
- Verify Twilio credentials are correct
- Check Twilio account balance (trial accounts have limited credits)
- For trial accounts, ensure recipient number is verified in Twilio

**Error: "Invalid phone number"**
- Phone numbers must include country code (e.g., `+1` for US)
- Use E.164 format: `+[country code][number]`

### General Auth Issues:

**Error: "Invalid JWT"**
- Clear browser localStorage and try again
- Check that environment variables are correctly set
- Verify Supabase project URL and anon key match

---

## Summary

✅ **What's Been Implemented**:
- Google OAuth UI (button + redirect flow)
- Phone/SMS UI (phone input + OTP verification)
- OAuth callback page (`/auth/callback`)
- Backend token exchange endpoint (`/api/auth/supabase-callback`)

📋 **What You Need to Do**:
1. **Fix email rate limit**: Disable "Confirm email" in Supabase dashboard
2. **Enable Google OAuth**: Get Google OAuth credentials and configure in Supabase
3. **Enable Phone Auth**: Set up Twilio account and configure in Supabase
4. **Test locally**: Verify both auth methods work
5. **Deploy**: Add environment variables to Vercel and Render

---

## Next Steps

Once you've completed the Supabase configuration:

1. **Test locally first** to ensure everything works
2. **Deploy to production** with proper environment variables
3. **Monitor authentication** in Supabase dashboard (Authentication → Users)

For any issues, check the browser console and backend logs for error details.
