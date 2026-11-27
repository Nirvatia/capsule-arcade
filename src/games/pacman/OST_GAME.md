# OST — the game

Common rules, format and generating: [OST.md](OST.md). The main game: the menu, the four season
levels, the energizer's fright and the jingles. The bosses have their own files
([hell](OST_HELL.md), [station](OST_STATION.md)); the secret arcade level keeps its own pixel
synthesiser (`audio/ArcadeSynth`) and is not part of this list.

Today the seasons play the classic siren samples (`siren0–4.wav`, climbing as the dots run low),
the fright and the jingles are the arcade's own samples (`static/assets/pacman/sfx/`), and the
menu is silent. The new soundtrack replaces them as it arrives, a file at a time; a track that is
missing leaves the classic sample in place.

## The brief

The game is a cute, top-down arcade maze in four holiday seasons (summer fair, autumn Halloween,
winter New Year, spring hanami; `DESIGN.md` §6). The music is cheerful and bouncy with the arcade's
urgency kept: it must leave room for the chomps and the bites (nothing dense in 2–5 kHz), and the
last quarter of the dots has a faster variation, since the siren's rising urgency is lost.
Instrumental only. The game's new name is not in any prompt or file.

## The tracks

| File                | When                                        | Length / loop             | Mood and key                                                                  |
| ------------------- | ------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------- |
| `menu.ogg`          | the main menu, the hero's choice            | 60–90 s, a loop           | the arcade's warmth, short and catchy; C major, 112 bpm                       |
| `start.ogg`         | READY at a new game                         | one shot, 4–5 s           | a bright fanfare (the classic jingle's job)                                   |
| `summer.ogg`        | a summer level                              | 60 s, a loop              | fair: ukulele, marimba, steel drum; F major, 132 bpm                          |
| `autumn.ogg`        | an autumn level                             | 60 s, a loop              | Halloween, spooky-cute: celesta, pizzicato, a theremin wink; A minor, 108 bpm |
| `winter.ogg`        | a winter level                              | 60 s, a loop              | New Year: music box, sleigh bells, warm bass; G major, 120 bpm                |
| `spring.ogg`        | a spring level                              | 60 s, a loop              | hanami: koto and shamisen plucks, a soft flute; D major pentatonic, 112 bpm   |
| `<season>-fast.ogg` | the last quarter of the dots                | the same bars, +12% tempo | the same melody, thicker drums, a higher register                             |
| `fright.ogg`        | the energizer: the hunted ghosts            | 8–12 s, a loop            | tense but playful, the hero is the hunter; one for all seasons                |
| `clear.ogg`         | a level cleared                             | one shot, 3–4 s           | a happy run up, a held chord                                                  |
| `death.ogg`         | the hero is caught                          | one shot, 2–3 s           | a falling wobble, comic, not grim                                             |
| `gameover.ogg`      | no lives left                               | one shot, 4–5 s           | a sad trombone and a music-box tail                                           |
| `extra-life.ogg`    | a bonus life                                | one shot, 1–2 s           | a rising sparkle                                                              |
| `boss-intro.ogg`    | before a boss level (the hell, the station) | one shot, 3–4 s           | a drum roll and a low brass hit; no key, so it fits either boss               |
| `credits.ogg`       | optional: the end screen                    | 90 s, not a loop          | the menu's theme, slow and warm                                               |

The fast variation has the same bar count and the same bar lines as its base, so the game can
swap them at a bar line; it is a stem set, not a new tune. The season tracks run under
`WORLD_MUSIC`'s `<season>` keys; the fright, the stingers and the menu are new keys for the
player (a small change in `audio/PacmanAudioPlayer.ts`, made when the first of them arrives).

## Prompts (instrumental)

**Menu**

> Warm, catchy arcade menu loop for a cute top-down maze game. Instrumental, 112 bpm, C major.
> Bouncy bass, glockenspiel and marimba melody, light chiptune lead, hand claps, a little
> swing. Friendly and inviting, leaves room for sound effects. Seamless loop, no intro or
> outro, 60 seconds.

**Summer**

> Cheerful summer fair loop for a cute top-down arcade maze game. Instrumental, 132 bpm,
> F major. Ukulele and marimba, light chiptune lead, hand claps, steel drum accents. Bouncy,
> sunny, playful; leaves room for sound effects (not busy in the high mids). Seamless loop, no
> intro or outro, 60 seconds.

**Autumn**

> Spooky-cute Halloween loop for a top-down arcade maze game. Instrumental, 108 bpm, A minor.
> Pizzicato strings, celesta, a wobbling theremin accent, a light shuffling drum kit, bat-wing
> flutters. Mischievous, never frightening. Leaves room for sound effects. Seamless loop, no
> intro or outro, 60 seconds.

**Winter**

> Festive New Year loop for a cute top-down arcade maze game, a snowy town at night.
> Instrumental, 120 bpm, G major. Music box, sleigh bells, soft glockenspiel, a warm round
> bass, brushed drums, a little fanfare of brass at the turn. Cosy and celebratory. Leaves room
> for sound effects. Seamless loop, no intro or outro, 60 seconds.

**Spring**

> Gentle hanami loop for a cute top-down arcade maze game, cherry blossoms in the wind.
> Instrumental, 112 bpm, D major pentatonic. Plucked koto and shamisen, a soft bamboo flute,
> light taiko pats, a warm upright bass. Serene but light on its feet. Leaves room for sound
> effects. Seamless loop, no intro or outro, 60 seconds.

**Fast variation** (each season: render with the base's tempo ×1.12, the same key and bars)

> The same loop as the base, urgent: tempo 12 percent faster, a busier drum kit, the melody an
> octave higher, rising energy. Same length in bars, seamless loop.

**Fright**

> Playful tense loop, 10 seconds, for the moment a hero turns the tables on chasing ghosts in
> an arcade maze game. Instrumental, a driving walking bass, a wobbling synth lead, a snare roll
> in the last bar. Seamless loop.

**Stingers** (each a separate render)

> A three-second level-clear sting for a cute arcade game: a happy rising arpeggio and a held
> major chord with a bell. No drums.

> A two-second comic defeat sting: a falling wobbling synth glide and a soft thud. Not grim.

> A five-second game-over sting: a sad muted trombone phrase and a music-box tail. Ends clean.

> A one-and-a-half-second sparkle: a bright rising bell run for a bonus life.

> A three-second boss-intro sting: a snare drum roll rising into one huge low brass hit and a
> cymbal swell. No key, no melody.

## Records

One line per shipped file: the file, the tool and model, the prompt, the seed, the date.
(none yet)
