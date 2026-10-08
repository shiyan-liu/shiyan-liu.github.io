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

## Reference-based media gate

Migration `202610080002_verified_media.sql` and the bundled Edge Function were deployed on 2026-10-08. Supabase `VISION_MODEL` is configured as `qwen/qwen3.5-plus-20260420`; its text-only connectivity check succeeded. Future CLI deployments must include the entire function directory, including `face-verification.mjs`. Set `VISION_MODEL` explicitly to an OpenRouter model supporting both image and video input; `VISION_API_KEY` may be set separately, or the server uses `EMBEDDING_API_KEY`. No default model or fallback provider is used. Model availability and quality must be assessed by the operator. See https://openrouter.ai/docs/guides/overview/multimodal/videos for the native `video_url` API format.

Set the reference in the local console with the person's informed consent. References, staged uploads, and accepted media stay in private Supabase storage. Uploads are temporarily staged before verification. The server compares the actual uploaded bytes with the reference; the public client cannot authorize storage with a separate frame request. A failed or ambiguous verdict grants no credit. Reference changes during verification invalidate the result. Successful finalization atomically grants three credits once, even after concurrent retries. Legacy ungated photo endpoints are disabled. Images are encoded as JPEG; videos must be MP4/WebM, at most 10 MB.

This is model-based visual matching, not a guarantee of a person's identity or liveness, and the short entry code remains the access control. A score threshold of 0.9 is an application decision, not a calibrated false-accept rate. Tests exercise mocked provider verdicts and media validation only; they do not establish real-world biometric accuracy. No private reference/candidate images were submitted during development.

## Playful whispers

The local console provides one optional `playful_hint` per gift, editable for the current gift. Keep it vague; literal answers/aliases are rejected. When this is blank, the model only banters and has no gift hint. The player can expand a small whisper form under the guessing input. This does not spend or grant guessing credits. Conversation messages are sent to OpenRouter for the response and are saved in private `gift_whispers` records linked to the gift and player. The player and local console can review these by gift; the console also shows model, reported cost and invocation status. Failed calls are recorded without unsafe provider output; interrupted calls may remain pending. History is not forwarded to the model.

The default model is `qwen/qwen3.5-flash-02-23`, using `TEASE_API_KEY` or the existing server-side `EMBEDDING_API_KEY`. Optional `TEASE_MODEL` overrides it. The provider request contains only the approved hint and the current interaction, never the answer, aliases, embedding, photos, email, or guess history. The server rejects literal answer/alias disclosures in the reply. This is an extra filter, not a semantic guarantee; write hints that you are comfortable having shown to the player.

Apply migration `202610080003_tease.sql` before deployment. It adds the private hint column and extends the existing server-only rate limiter with a new server-only record table (RLS enabled; no anon/authenticated access). Limits: 160-character player messages, 120-character admin hints, 180 output tokens, 3 requests/minute, 20 attempted model calls/day per player (UTC reset). Failures still count toward the budget; no model or canned-response fallback is used. Synthetic model checks cost roughly $0.00002 each at the tested rate; other Gift API features have separate costs.
