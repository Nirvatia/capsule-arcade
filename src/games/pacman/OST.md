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

The quarantine lab being taken over: the squad of Pretenders on the hunt, the escape
(`DESIGN.md` §7a). **Dynamic, not ambient** (the owner, 2026-11-26): it drives the chase; the
infection brings up a harder layer; the escape is faster still.

- **Tempo**: 124 bpm; the escape 150 bpm.
- **Key**: E minor (Em, C, D under a rolling bass).
- **Layers**: a four-on-the-floor kick, offbeat hats, claps on 2 and 4, a rolling bass arpeggio
  in sixteenths with a filter that breathes, metallic stabs; the infection's layer (the same
  length, synced): sixteenth hats, a hard bass a minor second against it, toms, scrapes.
- **Avoid**: anything that masks the squad's sounds (mid-high clicks and growls), vocals.

**Prompt**:

> Dark sci-fi chase loop for a biolab overrun by alien organics. Instrumental, 124 bpm, E minor.
> Four-on-the-floor kick, offbeat hats, claps on 2 and 4, a rolling sixteenth-note synth bass
> arpeggio with a breathing filter, metallic industrial stabs, a low pad. Driving, tense, no
> vocals, no melody hooks. Seamless loop, no intro or outro, 90 seconds.

**The placeholders** (2026-11-26), synthesised offline by
`node prototypes/pacman/music/station.mjs calm|dread|escape out.wav`, then
`ffmpeg … -q:a 4 static/assets/pacman/music/station-<kind>.ogg`: `station-calm.ogg` (24 bars at
124 bpm, 46.5 s: the kick, hats, claps, the rolling bass, a pad, stabs), `station-dread.ogg` (the
same 24 bars, a layer over the calm, its volume the infection: sixteenth hats, a hard bass a
minor second against the calm's, toms, scrapes) and `station-escape.ogg` (16 bars at 150 bpm: a
broken beat, the two-tone siren, a fast bass, stabs). The station's effects are synthesised live (`audio/StationSynth`): the
tells' stings (the fence's rising hum, the ambush's wet clicks, the vent's hiss), the lurker's
fold and grab, a hit, the power cell (a charge whining up, a crack), the hatch charged, the
alarm (a klaxon over a falling bass), the lure's ping, the way out, and the food (a soft wet pop on
two pitches by turns, in place of the seasons' chomp).

### Seasons (optional)

If a season gets a track, it replaces the siren for that season only. Light and bouncy, the
season's colour, chiptune-meets-acoustic, 120–140 bpm, major keys; the urgency of the siren is
lost, so a second, faster variation for the last quarter of the dots is welcome.

**Prompt** (summer, as an example):

> Cheerful summer fair loop for a cute top-down arcade maze game. Instrumental, 132 bpm,
> F major. Ukulele and marimba, light chiptune lead, hand claps, steel drum accents. Bouncy,
> sunny, playful; leaves room for sound effects (not busy in the high mids). Seamless loop, no
> intro or outro, 60 seconds.
