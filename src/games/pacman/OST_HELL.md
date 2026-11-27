# OST — the hell

Common rules, format and generating: [OST.md](OST.md). The hell is one flesh world with a slow
heartbeat (~2.5 s, the walls breathe with it): charred iron plates on red flesh, a boss in three
phases (`DESIGN.md` §7, §12).

## The brief

The music is that heartbeat made into a march: dark, low, patient, never a wall of noise, so the
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

## The tracks

| File                       | When                                        | Length / loop                  | Status                                              |
| -------------------------- | ------------------------------------------- | ------------------------------ | --------------------------------------------------- |
| `hell.ogg`                 | the whole fight (phase 1)                   | 60 s, 24 bars, a seamless loop | placeholder in the game (synthesised)               |
| `hell-2.ogg`, `hell-3.ogg` | boss phases 2 and 3 (stems, below)          | the same 24 bars               | wanted; the game needs a small change to layer them |
| `hell-win.ogg`             | the boss falls, the heart and the exit open | one shot, 4–6 s                | wanted (the shared level-clear jingle plays now)    |
| `hell-lose.ogg`            | the hero falls in the hell                  | one shot, 3–4 s                | wanted                                              |

**Phases as stems** (the station's dread layer works so): `hell.ogg` is the base; `hell-2` and
`hell-3` are layers of the same 60 s, tempo and key that are laid over it as the boss's phase
rises (phase 2: the toms and a second drone a fifth up; phase 3: the lead doubled an octave
down, an iron scrape on every beat 3, a faster heartbeat felt as sixteenth ghost notes). They
carry no pad of their own, so the sum stays clean. A phase layer's loudness steps up, never
jumps: the game should cross-fade them over a bar.

**The sting** (`hell-win`, `hell-lose`): `win` resolves the Phrygian half step upward to a
bare D major fifth, a bell and a low choir; `lose` is the heartbeat slowing to a stop under
a falling brass note. Neither longer than six seconds; they replace the loop, they do not
loop.

## The placeholder

`hell.ogg` follows this brief, synthesised offline by
`node prototypes/pacman/music/hell.mjs out.wav` (no dependencies; a sub drone, the heartbeat,
a formant pad, anvils, toms, a lead and a Schroeder reverb; every continuous tone on a 1/60 Hz
grid so the loop meets itself), then `ffmpeg … -q:a 4 static/assets/pacman/music/hell.ogg`.
A real track replaces the file; nothing else changes.

## Prompts (instrumental)

**Base loop**

> Dark cinematic boss-fight loop for a cute top-down arcade maze game set in hell. Instrumental,
> 96 bpm, D Phrygian. A slow double heartbeat kick on every bar, deep sub drone, low wordless
> "ah" choir pad, distant anvil strikes, low war toms, a slow distorted reed melody with a
> half-step motif (D–Eb). Ominous, heavy, patient, not noisy; no guitars, no vocals with
> words, no bright cymbals. Seamless loop, no intro or outro, 60 seconds.

**Phase layer** (render with the base's tempo and key; keep only what is new)

> Layer for a dark boss-fight loop, 96 bpm, D Phrygian: only low war toms in rolling triplets,
> a second sub drone a fifth above the root, and a scraping iron hit on every third beat. No
> melody, no pad, no choir, nothing above 4 kHz. Seamless loop, 60 seconds.

**Win**

> A four-second victory sting after a hell boss fight, D Phrygian resolving to a bare D major
> fifth: one large bell, a low wordless choir swell, a soft brass note. No drums. Ends clean.

**Lose**

> A three-second defeat sting: a heartbeat slowing to a stop under one falling low brass note
> and a dull anvil strike. No melody. Ends in silence.

## Records

One line per shipped file: the file, the tool and model, the prompt, the seed, the date.
(none yet)
