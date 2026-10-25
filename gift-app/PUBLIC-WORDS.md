# Public word rooms

Public entry: `/w/`. Invitation: `/w/#<12-character random code>`.
Private game remains `/zz/words/` with its existing authentication and history.

The public bundle uses only the publishable project key. Each browser keeps a random 256-bit seat token locally; the server stores its SHA-256 digest. Room codes have 72 random bits. Joining requires a button click, so link previews do not claim seats. A full room rejects new tokens. Clearing browser storage may lose the seat.

`open_word_*` tables and service-only RPCs are independent of private `word_*` data. They share the project's database and Edge Function quotas. Only readiness flags are returned until both words are committed. Room locks serialize submissions and seat assignment. Public input cannot choose a seat.

Limits: 5 new rooms/hour/IP, 20/day/IP, 60 joins/hour/IP, 60 authorized actions/minute/token, 200 rooms/day/project, 10,000 new round rows/day/project, 100 games/room and 100 rounds/game. Rooms expire after seven days; hourly cleanup removes expired public rooms. IP budgets use a separate transaction so failed join attempts still consume a budget. Global quotas also constrain distributed abuse.

Public polling waits two seconds after each request while a submitted player waits for the partner; otherwise six seconds during active games and twelve while waiting for a partner or after a win. Hidden tabs pause and resuming a visible tab requests state immediately. Five minutes of inactivity pauses polling except while awaiting a submitted round's reveal. Unchanged room versions return a small response. Network requests time out after 15 seconds. Private mode polls every two seconds without overlapping state requests.

At 100 daily users, text data is small. Request volume depends on session duration: ten minutes each at two-second polling would be approximately 30,000 invocations/day or 900,000/month before submissions. Public mode polls less frequently outside the reveal wait, so actual usage varies. Shared Edge invocation quota is more likely to matter than storage. This is an estimate, not a load benchmark.

Validation records in `verification/public-word-*.json` distinguish local PostgreSQL tests, live HTTP integration, and Chrome UI checks. Deploy SQL migration first, bundled gift-api second, then publish `/w/` assets through GitHub Pages.
