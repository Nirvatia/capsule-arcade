import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { SEASON_MAZES } from '../../config/mazes';
import type { SeasonData, SeasonName } from '../level/SeasonCatalog';
import type { BotResult } from './balanceBot';
import { playLevel } from './balanceBot';
import type { GameProfile } from '../rules/HypnosisService';

/**
 * The balance report (not part of the normal run): `BALANCE=1 npx vitest run
 * src/games/pacman/logic/balance` plays every season maze in every season, as both heroes, by
 * the bot, and prints a table; `BALANCE_OUT=<file>` writes it to a file too. `BALANCE_SEEDS`
 * sets the runs per case (default 12).
 */
const ON = Boolean(process.env.BALANCE);
const SEEDS = Number(process.env.BALANCE_SEEDS ?? 12);
const SEASONS: readonly SeasonName[] = ['summer', 'autumn', 'winter', 'spring'];
const PROFILES: readonly GameProfile[] = ['pacman', 'ms-pacman'];

interface Row {
	readonly label: string;
	readonly results: BotResult[];
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const median = (xs: number[]) => {
	const s = [...xs].sort((a, b) => a - b);
	return s.length ? s[Math.floor(s.length / 2)] : 0;
};

function line(row: Row): string {
	const r = row.results;
	const cleared = r.filter((x) => x.cleared).length / r.length;
	const first = r.map((x) => x.firstDeathAt);
	return [
		row.label.padEnd(26),
		`clear ${(cleared * 100).toFixed(0).padStart(3)}%`,
		`time ${mean(r.map((x) => x.seconds))
			.toFixed(0)
			.padStart(4)}s`,
		`deaths ${mean(r.map((x) => x.deaths)).toFixed(2)}`,
		`first death ${median(first).toFixed(0).padStart(3)}s`,
		`score ${mean(r.map((x) => x.score))
			.toFixed(0)
			.padStart(5)}`,
		`echo ${(mean(r.map((x) => x.echoTokens)) * 100).toFixed(0).padStart(3)}%`,
		`hypnoses ${mean(r.map((x) => x.hypnoses)).toFixed(1)} (feed ${mean(r.map((x) => x.feeders)).toFixed(1)} hunt ${mean(r.map((x) => x.hunters)).toFixed(1)}, ghosts eaten ${mean(r.map((x) => x.huntedGhosts)).toFixed(1)}, dots fed ${mean(r.map((x) => x.fedDots)).toFixed(1)})`
	].join('  ');
}

describe.skipIf(!ON)('balance report', () => {
	it('plays every maze in every season as both heroes', () => {
		const rows: Row[] = [];
		let level = 1;
		for (const profile of PROFILES) {
			for (const [m, grid] of SEASON_MAZES.entries()) {
				for (const name of SEASONS) {
					const season: SeasonData = { name, grid, maze: `grid_0${m + 1}` };
					const results: BotResult[] = [];
					for (let seed = 1; seed <= SEEDS; seed += 1) {
						results.push(playLevel({ season, level, profile, seed: seed * 7919 + m * 31 }));
					}
					rows.push({ label: `${profile} ${season.maze} ${name}`, results });
					level += 1;
				}
			}
		}
		const group = (label: string, pick: (r: Row) => boolean): Row => ({
			label,
			results: rows.filter(pick).flatMap((r) => r.results)
		});
		const out: string[] = [`runs per case: ${SEEDS}`, ''];
		for (const profile of PROFILES) {
			out.push(`== ${profile}: by maze ==`);
			for (let m = 1; m <= 4; m += 1) {
				out.push(
					line(
						group(
							`grid_0${m}`,
							(r) => r.label.startsWith(profile) && r.label.includes(`grid_0${m}`)
						)
					)
				);
			}
			out.push(`== ${profile}: by season ==`);
			for (const name of SEASONS) {
				out.push(line(group(name, (r) => r.label.startsWith(profile) && r.label.endsWith(name))));
			}
			out.push('');
		}
		out.push('== all cases ==');
		for (const r of rows) out.push(line(r));
		const text = out.join('\n');
		if (process.env.BALANCE_OUT) writeFileSync(process.env.BALANCE_OUT, text);
		expect(rows.length).toBe(PROFILES.length * 16);
	}, 1_800_000);
});
