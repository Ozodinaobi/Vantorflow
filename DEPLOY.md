# Deploying Vantorflow to Vercel (beginner steps)

Your code lives on GitHub at github.com/Ozodinaobi/vantorflow. Vercel reads it from there and puts the app on the internet.

## 1. Sign in to Vercel with GitHub

1. Go to vercel.com.
2. Click Sign Up (or Log In) and choose "Continue with GitHub".
3. Allow Vercel access to your GitHub account. Give it access to the vantorflow repo when asked.

## 2. Import the repo

1. On your Vercel dashboard, click "Add New..." then "Project".
2. Find vantorflow in the list and click "Import".
3. Leave the framework as Next.js and the build settings as they are. Vercel detects them automatically.

## 3. Add the environment variables (your secret keys)

Before you click Deploy, open the "Environment Variables" section. Add these three, one at a time. Name goes in the first box, value in the second.

- NEXT_PUBLIC_SUPABASE_URL: your Supabase project URL (looks like https://xxxx.supabase.co). Copy it from Supabase, Project Settings, API.
- SUPABASE_SERVICE_ROLE_KEY: the long "service_role" key from the same Supabase API page. Keep it secret. Copy it from your local .env.local file.
- GEMINI_API_KEY: your Google AI Studio key. Copy it from your local .env.local file.

The real values are already in your local .env.local file on your computer. Do not paste them into any file in this repo. The .env.local file is never uploaded to GitHub.

## 4. Deploy

Click Deploy. Wait 1 to 3 minutes. Vercel gives you a live link ending in .vercel.app. Open it to check the app works and that you can log in.

If the build fails, open the deployment logs on Vercel and check that all three variables are spelled exactly as above.

## 5. Add your custom domain (vantorflow.com.ng)

1. In your Vercel project, go to Settings, then Domains.
2. Type vantorflow.com.ng and click Add. Choose the option to add it as the main domain. Vercel may also offer www.vantorflow.com.ng, so add that too.
3. Vercel shows you DNS records to set. Usually an A record for the root domain pointing to 76.76.21.21, and a CNAME record for www pointing to cname.vercel-dns.com. Use the exact values Vercel shows on screen, as they can change.
4. Log in to wherever you manage the domain (the company that sold you vantorflow.com.ng). Find the DNS settings and add those records. Delete any old A or CNAME record for the same name first.
5. Go back to Vercel. Wait for the domain to show a green check. This can take a few minutes up to a few hours.

Once the check is green, https://vantorflow.com.ng opens your app.

## Every time you change the code

Push the change to GitHub and Vercel redeploys automatically.
