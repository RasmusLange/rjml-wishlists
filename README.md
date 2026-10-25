# Wishlists

A small wishlist app for two. Make as many lists as you like, sort wishes into sections, drag them into order, and export any list as a PDF in the style of our original "Ønskeseddel".

Built with Next.js, Postgres (via Drizzle), and `@react-pdf/renderer`. It runs on Vercel's free tier with a free Neon database.

## Deploying to Vercel

1. Import this repository at [vercel.com/new](https://vercel.com/new). Don't deploy yet if it asks; the first build needs the database.
2. In the new project, open **Storage → Create Database → Neon** (free plan) and connect it to the project. This sets `DATABASE_URL` for you.
3. Under **Settings → Environment Variables**, add:
   - `APP_USERS`: who can log in, as `Name:password` pairs, e.g. `Rasmus:some-password,Tereza:another-password`
   - `SESSION_SECRET`: any long random string (40+ characters)
4. Deploy (or redeploy). Each build applies pending database migrations before building.

To change a password later, edit `APP_USERS` and redeploy.

## Running locally

```bash
cp .env.example .env.local   # then fill in the values
npm install
npm run db:migrate
npm run dev
```

## Changing the database

Edit `src/db/schema.ts`, then run `npm run db:generate` and commit the new file in `drizzle/`. The next deploy applies it.

## Fonts

The PDF embeds Fraunces and IBM Plex Sans (SIL Open Font License, see `src/pdf/fonts`).
