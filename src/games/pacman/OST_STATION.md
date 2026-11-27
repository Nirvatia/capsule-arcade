# OST — the station

Common rules, format and generating: [OST.md](OST.md). The station is a quarantine lab taken
over by a black parasite: its hive's veins grow from the lair as the infection rises, the squad
of amoebas hunts, and the way out is an escape (`DESIGN.md` §7a).

## The brief

**Dynamic, not ambient** (the owner, 2026-11-26): the music drives the chase; the infection
brings up a harder layer; the escape is faster still. The look moved on to a black, organic hive
(2026-11-26), so the second pass of the tracks may lean organic over industrial: wet, throbbing
low end, scraped metal underneath, never a clean sci-fi pad.

- **Tempo**: 124 bpm; the escape 150 bpm.
- **Key**: E minor (Em, C, D under a rolling bass).
- **Layers**: a four-on-the-floor kick, offbeat hats, claps on 2 and 4, a rolling bass arpeggio
  in sixteenths with a filter that breathes, metallic stabs; the infection's layer (the same
  length, synced): sixteenth hats, a hard bass a minor second against it, toms, scrapes.
- **Avoid**: anything that masks the squad's sounds (mid-high clicks and growls), vocals.
- **The squad's tells** are effects (`audio/StationSynth`), not music: the music must leave room
  for their sting (a rising hum, wet clicks, a hiss) in the 2–5 kHz band.

## The tracks

| File                 | When                                                   | Length / loop                      | Status                               |
| -------------------- | ------------------------------------------------------ | ---------------------------------- | ------------------------------------ |
| `station-calm.ogg`   | the level, from the start                              | 24 bars at 124 bpm, 46.5 s, a loop | placeholder (synthesised)            |
| `station-dread.ogg`  | a layer over the calm, its volume the infection        | the same 24 bars, in sync, a loop  | placeholder (synthesised)            |
| `station-escape.ogg` | the escape (the alarm), in place of both               | 16 bars at 150 bpm, a loop         | placeholder (synthesised)            |
| `station-power.ogg`  | optional: while the squad is frightened (a power cell) | 8 bars at 124 bpm, a loop          | wanted (the shared fright plays now) |
| `station-win.ogg`    | the hero is out through the hatch                      | one shot, 4–6 s                    | wanted                               |
| `station-lose.ogg`   | the third hit ends the level                           | one shot, 3–4 s                    | wanted                               |

The dread layer carries no kick and no pad: it adds only what the infection adds, so with the
calm it sums to the full groove. The escape is a different feel, not a layer: a broken beat, a
two-tone siren, a fast bass, stabs.

## The placeholders

Synthesised offline by `node prototypes/pacman/music/station.mjs calm|dread|escape out.wav`, then
`ffmpeg … -q:a 4 static/assets/pacman/music/station-<kind>.ogg`: `station-calm` (24 bars at
124 bpm: the kick, hats, claps, the rolling bass, a pad, stabs), `station-dread` (the same 24
bars: sixteenth hats, a hard bass a minor second against the calm's, toms, scrapes) and
`station-escape` (16 bars at 150 bpm: a broken beat, the two-tone siren, a fast bass, stabs).
The station's effects are synthesised live (`audio/StationSynth`): the tells' stings, the
lurker's fold and grab, a hit, the power cell (a charge whining up, a crack), the hatch charged,
the alarm (a klaxon over a falling bass), the lure's ping, the way out, and the food (a soft wet
pop on two pitches by turns, in place of the seasons' chomp).

## Prompts (instrumental)

**Calm** (the level)

> Dark sci-fi chase loop for a biolab overrun by a black organic parasite. Instrumental,
> 124 bpm, E minor. Four-on-the-floor kick, offbeat hats, claps on 2 and 4, a rolling
> sixteenth-note synth bass arpeggio with a breathing filter, metallic industrial stabs, a low
> pad, a wet throbbing sub. Driving, tense, no vocals, no melody hooks. Seamless loop, no intro
> or outro, 90 seconds.

**Dread layer** (render with the calm's tempo, key and length; only what is new)

> Layer over a 124 bpm E minor chase loop: sixteenth-note closed hats, a hard distorted bass a
> minor second above the root, low rolling toms, scraping metal and wet organic noise. No kick,
> no pad, no melody, no vocals. Seamless loop, same length as the base.

**Escape**

> Panic escape loop for a sci-fi game, an alarm in a biolab. Instrumental, 150 bpm, E minor. A
> broken, driving beat, a two-tone klaxon siren, a fast sixteenth bass, metallic stabs rising in
> pitch, no pad. Urgent, relentless, no vocals, no melody hooks. Seamless loop, 40 seconds.

**Power** (optional)

> Short tense-but-playful loop, 124 bpm, E minor: the same pulse with the kick dropped out, a
> bouncing bass, a high plucked arpeggio, a hint of triumph. The player is briefly the hunter.
> Instrumental, seamless loop, 15 seconds.

**Win / lose**

> A five-second relief sting: the alarm cuts out, a low drone opens into a warm E major chord, a
> soft airlock hiss. No drums.

> A three-second defeat sting: a heavy low thud, a descending synth glide, the heartbeat of a
> hive swelling and cutting off.

## Records

One line per shipped file: the file, the tool and model, the prompt, the seed, the date.
(none yet)
