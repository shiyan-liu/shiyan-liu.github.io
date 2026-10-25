# Private-space background music

`wo-ai-ni.m4a` is the user-supplied `SHE-我爱你.mp3`, converted to 128 kbps AAC for website playback. The supplied recording contains approximately 332.21 seconds of decoded audio. The entire recording is preserved; it replaces the earlier 60-second CDN excerpt. No signed CDN URL is bundled.

This directory is copied to `/zz/audio/`. The separate public `/w/` game does not include or request the player.

The switch uses localStorage (`zz-bgm-enabled`). Playback position is tab-local sessionStorage (`zz-bgm-position`). The listener opts in before playback; internal private-space navigation keeps the audio element mounted.
