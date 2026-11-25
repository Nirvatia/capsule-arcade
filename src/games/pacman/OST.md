# Pac-Man — soundtrack brief (OST)

What the game's music should be, how a track goes into the game, and the prompts for a music
generator. The game plays samples for everything else (`audio/PacmanAudioPlayer`); a world with
a track of its own plays it in place of the classic siren.

## How a track goes in

- **Format**: OGG Vorbis, 44.1 kHz stereo, quality 4 (`ffmpeg -i in.wav -c:a libvorbis -q:a 4
out.ogg`); about 0.8 MB a minute. Peak at −1 dBFS, loudness around −16 LUFS (the samples sit
  at that level; the player sets the track's own volume in `WORLD_MUSIC`).
- **A seamless loop**: the last sample flows into the first. No fade in or out, no silence at
  either end, the reverb's tail of the end already inside the start (render two passes and keep
  the second, or loop it in the editor). 60–120 s; a whole number of bars.
- **Where**: `static/assets/pacman/music/<world>.ogg`, then one line in `WORLD_MUSIC`
  (`audio/PacmanAudioPlayer.ts`): `{ file: '/assets/pacman/music/<world>.ogg', volume: 0.5 }`.
- **In play**: the track loops while the level plays; the energizer's fright replaces it and
  it resumes where it was; a pause or a death pauses it; a new game starts it over. Keep it
  under the effects: the chomps, the ghost bites and the boss must stay clear on top (no dense
  high end in 2–5 kHz, where the effects live).
- **Rights**: a generated track must be one the service lets us ship in a game (check the plan
  the track was made on).

## Tracks

| World                             | Status                                            | Mood                                                       |
| --------------------------------- | ------------------------------------------------- | ---------------------------------------------------------- |
| Hell (boss)                       | placeholder in the game (`hell.ogg`, synthesised) | a slow, heavy heartbeat; dread, not noise                  |
| Station (boss)                    | placeholder in the game (`station-*.ogg`)         | quarantine-lab horror: cold, sparse, a pulse that quickens |
| Spring / summer / autumn / winter | optional (the siren is the classic)               | light, bouncy, the season's colour                         |
| Menu                              | optional                                          | the arcade's warmth, short and catchy                      |

### Hell — the brief

The hell is one flesh world with a slow heartbeat (~2.5 s, the walls breathe with it). The
music is that heartbeat made into a march: dark, low, patient, never a wall of noise, so the
boss's attacks and the hero's bites read on top.

- **Tempo**: 96 bpm, 4/4; one bar = one heartbeat (2.5 s). The double beat ("lub-dub") on the
  bar's first beat.
- **Key**: D Phrygian / D Phrygian dominant (D Eb F# G A Bb C): the half step D–Eb is the
  hell's colour. Chords: Dm – Bb – Gm – A, six bars each.
- **Layers**: a sub drone on D1 with its fifth, slightly saturated; the heartbeat as two low
  thumps; a choir-like pad ("ah"), low and wide; an anvil strike every four bars; low toms
  leading into every other bar; a slow lead (a distorted reed or brass) in two phrases of three.
- **Arc**: 60 s loop; the first third pad and heartbeat only, the lead in the second and third.
- **Avoid**: blast beats, metal guitars, vocals with words, anything bright above 5 kHz,
  sudden silences (the loop must breathe evenly).

**The placeholder** (`hell.ogg`) follows this brief, synthesised offline by
`node prototypes/pacman/music/hell.mjs out.wav` (no dependencies; a sub drone, the heartbeat,
a formant pad, anvils, toms, a lead and a Schroeder reverb; every continuous tone on a 1/60 Hz
grid so the loop meets itself), then `ffmpeg … -q:a 4 static/assets/pacman/music/hell.ogg`.
A real track replaces the file; nothing else changes.

**Prompt** (Suno / Udio, instrumental):

> Dark cinematic boss-fight loop for a cute arcade game set in hell. Instrumental, 96 bpm,
> D Phrygian. A slow double heartbeat kick on every bar, deep sub drone, low wordless "ah"
> choir pad, distant anvil strikes, low war toms, a slow distorted reed melody with a
> half-step motif (D–Eb). Ominous, heavy, patient, not noisy; no guitars, no vocals with
> words, no bright cymbals. Seamless loop, no intro or outro, 60 seconds.

### Station — the brief

The quarantine lab in the storm: dark corridors, a torch fed by the dots, a hound pack
(`DESIGN.md` §7a). Cold, sparse, listening: the player should hear the hounds.

- **Tempo**: 80 bpm; a soft pulse (a ticking reactor, a muffled heartbeat) that the game may
  later speed up with danger (a second, faster stem: 100 bpm, the same key and length).
- **Key**: C minor with clusters; long tones, little melody.
- **Layers**: a hum of machinery, a low pulse, metallic resonances, a distant alarm motif
  (two notes, a minor second), storm rumble far away.
- **Avoid**: jump-scare stingers inside the loop (the game makes its own), anything that
  masks the hounds' sounds (mid-high clicks and growls).

**Prompt**:

> Sci-fi horror ambient loop for a quarantine lab in a storm. Instrumental, 80 bpm, C minor.
> Low machinery hum, a soft ticking pulse like a reactor, metallic resonances, a distant
> two-note alarm motif a minor second apart, far thunder. Cold, sparse, tense, lots of space;
> no melody hooks, no drums kit, no vocals. Seamless loop, no intro or outro, 90 seconds.

**The placeholders** (2026-11-25), synthesised offline by
`node prototypes/pacman/music/station.mjs calm|dread|escape out.wav`, then
`ffmpeg … -q:a 4 static/assets/pacman/music/station-<kind>.ogg`: `station-calm.ogg` (48 s: the
mains hum, the ventilation's air, a low E-minor pad, sparse metallic pings), `station-dread.ogg`
(48 s, a layer over the calm, its volume the infection: an irregular heartbeat, a minor-second
cluster, scrapes, creaks) and `station-escape.ogg` (32 s at 140 bpm: a two-tone siren, a driving
bass, a kick and hats). The station's effects are synthesised live (`audio/StationSynth`): the
tells' stings (the fence's rising hum, the ambush's wet clicks, the vent's hiss), the lurker's
fold and grab, a hit, the power cell, the hatch charged, the alarm, the lure's ping, the way out.

### Seasons (optional)

If a season gets a track, it replaces the siren for that season only. Light and bouncy, the
season's colour, chiptune-meets-acoustic, 120–140 bpm, major keys; the urgency of the siren is
lost, so a second, faster variation for the last quarter of the dots is welcome.

**Prompt** (summer, as an example):

> Cheerful summer fair loop for a cute top-down arcade maze game. Instrumental, 132 bpm,
> F major. Ukulele and marimba, light chiptune lead, hand claps, steel drum accents. Bouncy,
> sunny, playful; leaves room for sound effects (not busy in the high mids). Seamless loop, no
> intro or outro, 60 seconds.
