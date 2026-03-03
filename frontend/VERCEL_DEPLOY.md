# Deploying to Vercel

This Next.js app lives in the `frontend` folder. To avoid 404s on `/`, `/verify`, and `/dashboard`:

1. In [Vercel](https://vercel.com) → your project → **Settings** → **General**.
2. Under **Root Directory**, click **Edit**.
3. Set it to **`frontend`** (or `./frontend`).
4. Save and **redeploy** (Deployments → ⋮ on latest → Redeploy).

Build and output directory will use the `frontend` folder, and all routes will work.
