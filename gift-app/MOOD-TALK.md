# Interactive mood cards

The existing mood picker starts a short model conversation rather than automatically sending an email. Each card offers three generated continuations, a freeform response, and four tone adjustments under a disclosure. Only the explicit save/mail button sends the currently displayed quote through the existing confirmation and owner-notification templates. Per-card/per-version Resend idempotency keys prevent duplicate sends.

All turns are automatically archived in `mood_talk_turns`, separately from the temporary 24-hour conversation cards. There are no memory management controls in the UI. The model maintains up to five long-term notes by selecting exact excerpts from real user messages or previously retained excerpts. Server validation rejects invented or rewritten memory text. The model can remove superseded notes and retain corrected preferences. The full archive is preserved even if a note is removed from the active memory bank; future prompts use recent turns and the active notes rather than unbounded history.

A service-only PostgreSQL commit function atomically writes each card version, the complete turn, and an optimistic update of its memory. A stale model response cannot overwrite a newer card. Concurrent memory edits use a version check; archived turns remain available for the next consolidation.

JWT-authenticated players and existing expiring reminder capabilities can use the feature. Tables and the commit RPC deny direct anonymous/authenticated access. Existing reminders, legacy clients, private games, and the separate public game retain their existing paths. Model/provider fallback is disabled; invalid responses or invented memory fail closed and retry once. Interaction requests are limited to ten per minute per account. Temporary card cleanup does not delete the complete archive.

Validation includes real OpenRouter conversations, automatic preference correction, persisted-turn checks, table permissions, selected-quote mail delivery to the owner's QA inbox, duplicate-send protection, and Chrome UI checks. See `verification/mood-talk-*.json`.
