import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { HELL_MAP_CANDIDATES } from './hellMaps';
import { HELL_BOT_PROFILES, playHell } from './hellBot';
import type { HellBotResult } from './hellBot';

/**
 * The hell's maze report (not part of the normal run): `HELL_BOTS=1 npx vitest run
 * src/games/pacman/logic/balance/hellReport.test.ts` lets the bots fight the boss on every
 * candidate maze and prints how well they dodge and how well the Sting and the Maw land.
 * `HELL_BOTS_SEEDS` sets the fights per case (default 8), `HELL_BOTS_OUT=<file>` writes the raw
 * results as JSON, `HELL_BOTS_MAPS=old,current` picks the mazes.
 */
const ON = Boolean(process.env.HELL_BOTS);
const SEEDS = Number(process.env.HELL_BOTS_SEEDS ?? 8);
const PICK = process.env.HELL_BOTS_MAPS?.split(',');

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(0)}%` : '—');

function line(label: string, r: HellBotResult[]): string {
	const faced = sum(r.map((x) => sum(Object.values(x.attacks).map((a) => a.faced))));
	const hit = sum(r.map((x) => sum(Object.values(x.attacks).map((a) => a.hit))));
	const fired = sum(r.map((x) => x.maw.fired));
	const landed = sum(r.map((x) => x.maw.full + x.maw.glance));
	const bolts = sum(r.map((x) => x.sting.bolts));
	const onBoss = sum(r.map((x) => x.sting.boss));
	return [
		label.padEnd(30),
		`won ${pct(r.filter((x) => x.won).length, r.length).padStart(4)}`,
		`time ${(sum(r.map((x) => x.seconds)) / r.length).toFixed(0).padStart(4)}s`,
		`dodge ${pct(faced - hit, faced).padStart(4)} of ${faced}`,
		`maw ${pct(landed, fired).padStart(4)} of ${fired}`,
		`sting ${pct(onBoss, bolts).padStart(4)} of ${bolts}`
	].join('  ');
}

describe.skipIf(!ON)('hell maze report', () => {
	it('the bots fight the boss on every candidate maze', () => {
		const out: Array<{
			map: string;
			label: string;
			profile: string;
			phase: number;
			mode: string;
			seed: number;
			result: HellBotResult;
		}> = [];
		const lines: string[] = [];
		for (const map of HELL_MAP_CANDIDATES) {
			if (PICK && !PICK.includes(map.id)) continue;
			for (const profile of HELL_BOT_PROFILES) {
				const results: HellBotResult[] = [];
				for (const phase of [1, 2, 3]) {
					// the fight as it comes, then the two gun drills (the weapon handed over full)
					for (const mode of ['fight', 'plasma', 'bfg'] as const) {
						const drill = mode === 'fight' ? undefined : mode;
						const seeds = mode === 'fight' ? SEEDS : Math.ceil(SEEDS / 2);
						for (let seed = 1; seed <= seeds; seed += 1) {
							const result = playHell({
								drawn: map.drawn,
								pickups: map.pickups,
								profile,
								seed,
								phase,
								drill,
								maxSeconds: drill ? 90 : 150
							});
							if (mode === 'fight') results.push(result);
							out.push({
								map: map.id,
								label: map.label,
								profile: profile.name,
								phase,
								mode,
								seed,
								result
							});
						}
					}
				}
				lines.push(line(`${map.label} · ${profile.name}`, results));
			}
		}
		console.log(lines.join('\n'));
		if (process.env.HELL_BOTS_OUT) writeFileSync(process.env.HELL_BOTS_OUT, JSON.stringify(out));
		expect(out.length).toBeGreaterThan(0);
	}, 3_600_000);
});
