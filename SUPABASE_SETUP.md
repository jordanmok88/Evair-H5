# Supabase Setup Guide for Evair H5

## Step 1: Create New Project

1. Navigate to https://supabase.com/dashboard/projects
2. Click **"New Project"**
3. Fill in the details:
   - **Project name**: `evair-h5`
   - **Database Password**: Generate a strong password (save it securely!)
     - Suggestion: Use a password manager or generate one like: `Ev@ir-H5-2026-xK9mP2nQ7wL5`
   - **Region**: Select **Southeast Asia (Singapore)** (closest to Hong Kong)
4. Click **"Create new project"**
5. Wait 2-3 minutes for provisioning

## Step 2: Get API Credentials

1. Once provisioned, go to **Settings > API**
2. Copy and save the following:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGc...` (long JWT token)

## Step 3: Run Database Schema

1. Go to **SQL Editor** in the left sidebar
2. Click **"New query"**
3. Copy the contents of `supabase-schema.sql` and paste it
4. Click **"Run"** or press `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (Mac)
5. Verify success - you should see "Success. No rows returned"

## Step 4: Verify Tables Created

1. Go to **Table Editor** in the left sidebar
2. You should see these tables:
   - `notifications`
   - `conversations`
   - `chat_messages`

## Step 5: Check Authentication

1. Go to **Authentication > Users**
2. Check if there's an admin user
3. If not, you'll need to create one:
   - Click **"Add user"**
   - Enter email and password
   - Click **"Create user"**

## Step 6: Configure Environment Variables

After completing the setup, add these to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

Replace `xxxxx` and the key with your actual values from Step 2.

## Step 7: Test Connection

You can test the connection by running:

```bash
npm run dev
```

And checking if the app can connect to Supabase.

## Troubleshooting

### SQL Schema Fails
- Make sure you copied the entire schema
- Check for any syntax errors in the SQL Editor
- Try running each section separately if needed

### Can't Connect from App
- Verify the URL and anon key are correct
- Check that Row Level Security policies are enabled
- Ensure the Realtime feature is enabled for chat tables

### Authentication Issues
- Make sure you've created at least one user
- Check that the user's email is confirmed
- Verify authentication settings in Supabase dashboard

## Next Steps

After setup is complete:
1. Test the notification system
2. Test the chat functionality
3. Create an admin user for managing notifications
4. Configure any additional authentication providers if needed
