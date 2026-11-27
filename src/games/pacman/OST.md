# Pac-Man — soundtrack (OST)

The game's music is being replaced as a whole (the owner, 2026-11-27), and the game gets a new
name. This file holds what is common: how a track goes into the game, the rules every track
follows, and how to generate music locally. The briefs and prompts are one file per part:

| File                             | What it covers                                                   |
| -------------------------------- | ---------------------------------------------------------------- |
| [OST_GAME.md](OST_GAME.md)       | the menu, the four seasons, the fright, the jingles and stingers |
| [OST_HELL.md](OST_HELL.md)       | the hell boss level                                              |
| [OST_STATION.md](OST_STATION.md) | the station boss level (calm, dread, escape)                     |

The game plays samples for everything else (`audio/PacmanAudioPlayer`); a world with a track of
its own plays it in place of the classic siren. The tracks do not carry the game's title, so the
rename touches no music file; prompts say "a cute top-down arcade maze game", never the name.

## How a track goes in

- **Format**: OGG Vorbis, 44.1 kHz stereo, quality 4 (`ffmpeg -i in.wav -c:a libvorbis -q:a 4
out.ogg`); about 0.8 MB a minute. Peak at −1 dBFS, loudness around −16 LUFS (the samples sit
  at that level; the player sets the track's own volume in `WORLD_MUSIC`). To bring a render to
  level first: `ffmpeg -i in.wav -af loudnorm=I=-16:TP=-1.5:LRA=11 out.wav`.
- **A seamless loop**: the last sample flows into the first. No fade in or out, no silence at
  either end, the reverb's tail of the end already inside the start (render two passes and keep
  the second, or loop it in the editor with a crossfade across the seam). A whole number of
  bars; 60–120 s unless the file says otherwise. Check the seam: `ffmpeg -stream_loop 3 -i
out.ogg -c copy long.ogg` and listen to the joins.
- **Where**: `static/assets/pacman/music/<name>.ogg`, then one line in `WORLD_MUSIC`
  (`audio/PacmanAudioPlayer.ts`): `{ file: '/assets/pacman/music/<name>.ogg', volume: 0.5 }`.
- **In play**: the track loops while the level plays; the energizer's fright replaces it and
  it resumes where it was; a pause or a death pauses it; a new game starts it over. Keep it
  under the effects: the chomps, the ghost bites and the boss must stay clear on top (no dense
  high end in 2–5 kHz, where the effects live).
- **Rights**: a generated track must be one the tool lets us ship in a game. Keep the prompt,
  the seed and the model's name beside every shipped file (a line in its brief's table).
- **Stems**: where a brief asks for layers, every layer has the same length, tempo and key as its
  base, so they can be summed in sync (the station's dread layer already works so).

## Generating music locally

Not installed or run in the session that wrote this; the steps are the project's own documentation
(read it again before installing, these tools move fast).

**The tool: ACE-Step 1.5** (open source, released 2026-01-28). Its licence is MIT and its model
card says the generated music may be used commercially; the project's own claim is that it was
trained on royalty-free material (not independently checked: keep the records above). It makes
full instrumental tracks from a text prompt and, per its guide, runs on a CUDA GPU (also Apple
MPS, AMD ROCm, Intel XPU, or a CPU, slowly).

What to install:

1. **Python 3.11 or 3.12** (3.12 for AMD ROCm on Windows), **Git**, and **uv** (the Python
   package manager the guide uses).
2. A GPU: the install guide asks for 4 GB of VRAM or more for the diffusion model alone, 6 GB
   or more with the language model that plans the track (the better setting); the larger XL
   model wants 12 GB (20 GB comfortable). About 10 GB of disk for the core models, downloaded on
   the first run. Windows and macOS portable packages exist if the steps below are a nuisance.
3. **ffmpeg** (the encode and the loudness steps above) and an audio editor with a crossfade
   (Audacity is enough) to make the loops.

```bash
git clone https://github.com/ACE-Step/ACE-Step-1.5
cd ACE-Step-1.5
uv sync
uv run acestep
```

The last command opens its web interface (Gradio) in the browser: paste a brief's prompt, mark
the track instrumental (no lyrics), set the length, and render several candidates; keep the one
with the right pulse and fewest surprises. Then the loop, the level, the encode and the line in
`WORLD_MUSIC`, as above. I have not verified its exact option names; follow its interface.

Not for shipping: MusicGen's weights are licensed non-commercial (CC-BY-NC); Stable Audio Open
is for sound design and short clips, and its community licence is free only under a revenue limit
and with a registration (check it before use). The online services (Suno, Udio) work with the
same prompts if their plan allows shipping in a game.
