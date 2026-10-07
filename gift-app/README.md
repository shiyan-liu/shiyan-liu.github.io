# Guess My Gift

The public game is built into `../gift/` and accessed by direct URL. It accepts the player code `zz` and contains only upload, guessing, and reveal. The private album and gift management are served by `scripts/admin-console.mjs` on `127.0.0.1:5174`; they are never built into GitHub Pages.

## Local console

Run `./start-gift-console.command` from the repository root, then open `http://127.0.0.1:5174`. The admin code is `lsy1`. The console runs locally, but it needs an Internet connection to reach the private Supabase storage. Its service key is kept in `.env.local`, which is ignored by Git. Never copy that key or `.env.local` into `gift/`.

The Supabase project `nemmxtfonfpzprvtynah` already has the `gift_*` tables, transactional RPCs, two internal Auth users, and a private `gift-private` bucket. The Auth email addresses are internal implementation details; the player never sees or enters them.

## Build

From this directory, run `pnpm build` (or `node scripts/build.mjs` after TypeScript checking). The build replaces `../gift/` and copies only the public Supabase URL and publishable key. `pnpm test` checks score normalization.

## Server configuration

The `gift-api` Edge Function is deployed to the configured Supabase project. Its encrypted secrets include `PLAYER_CODE`, `PLAYER_LOGIN_EMAIL`, `PLAYER_LOGIN_PASSWORD`, `LOGIN_RATE_SALT`, `EMBEDDING_MODEL`, and `ALLOWED_ORIGINS`; Supabase supplies its project URL, anon key, and service-role key to the function. Keep `ALLOWED_ORIGINS` to the homepage domain(s).

The same scoring model is used when creating a gift in the local console and when scoring a guess in the Edge Function. `EMBEDDING_API_KEY` is required and the configured provider model is `qwen/qwen3-embedding-8b` via OpenRouter; both sides fail closed when it is missing. There is no heuristic fallback. Exact answers and aliases are matched before the embedding score. The built-in Supabase `gte-small` model is English-only, so it is unsuitable for the Chinese guessing experience.

The player code `zz` is intentionally short and can be guessed. It grants access to the game and photo upload, **not** the private album; the database tables have RLS with no browser-facing policies, and the bucket is private. If you later want to stop unauthorized uploads, replace `zz` with a longer phrase.

Each new gift grants the player 3 guesses. Each distinct saved photo grants 3 more. Player and local console histories group guesses by gift.

## Email reminders

The player can enter an email address in the Gift page. A confirmation email must be opened before the address becomes active. She can unsubscribe from the page or from any gift notification email. The address and confirmation tokens remain in private Supabase tables; only the subscription's own status is returned to the player.

Resend sends the confirmation email from the Edge Function and new-gift reminders from the local console when a gift is saved. Configure `RESEND_API_KEY` and `GIFT_FROM_EMAIL` (for example `Guess My Gift <gift@shiyanliu.com>`) in both Supabase Edge Function secrets and `gift-app/.env.local`. The Resend domain must be verified before sending to arbitrary subscribers. Never put these values in `gift/config.js` or the public repository. Restart the local console after changing `.env.local`. The console records delivery status by gift and offers retry for failed sends; sent deliveries are skipped on retry.

Database migration `202610070003_gift_email.sql` creates the private subscription and delivery tables. The subscription endpoint fails closed when the mail service is not configured. A finished gift is shown in the player's history while the main panel waits for the next surprise.
