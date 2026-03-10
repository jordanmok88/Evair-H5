# Supabase Setup Guide for Evair H5

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click **New Project**, choose a name (e.g. `evair-h5`) and set a database password
3. Wait for the project to provision (~1 minute)

## 2. Run the Database Schema

1. In your Supabase Dashboard, go to **SQL Editor**
2. Open `supabase/schema.sql` from this project
3. Paste the contents and click **Run**
4. You should see all tables created successfully

## 3. Enable Realtime

1. Go to **Database > Replication**
2. Ensure `chat_messages` and `conversations` tables are listed under the `supabase_realtime` publication
3. The schema SQL already does this, but verify it's enabled

## 4. Create an Admin User

1. Go to **Authentication > Users**
2. Click **Add User** > **Create New User**
3. Enter your email and a strong password
4. This user will be used to log into the Admin Portal

## 5. Get Your API Keys

1. Go to **Settings > API**
2. Copy:
   - **Project URL** (e.g. `https://xxxx.supabase.co`)
   - **anon/public key** (safe for client-side use)

## 6. Configure Environment Variables

Add these to your `.env` file in the Evair H5 project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

And if deploying to Netlify, add the same variables in:
**Netlify Dashboard > Site Settings > Environment Variables**

## 7. Deploy

Run `npm run build` and deploy. The H5 app will automatically detect the Supabase configuration and use real data instead of mock notifications.

## Free Tier Limits

- 500 MB database storage
- 50,000 monthly active users
- Unlimited API requests
- Realtime subscriptions included
- 2 projects per organization
