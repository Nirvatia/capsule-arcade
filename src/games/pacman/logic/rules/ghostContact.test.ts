import { describe, expect, it, vi } from 'vitest';
import { GhostModel } from '../actors/GhostModel';
import type { GhostKind, GhostState } from '../actors/GhostModel';
import { classicContact, msContact } from './ghostContact';

/** A ghost standing on tile (x, y), centred at (x + .5, y + .5). */
function ghost(kind: GhostKind, x: number, y: number, state: GhostState): GhostModel {
	const g = new GhostModel(kind, { x, y }, 5, 0);
	g.setState(state);
	return g;
}

/** Pac-Man on the same tile centre as a ghost on (x, y). */
const on = (x: number, y: number) => ({ x: x + 0.5, y: y + 0.5 });
const noPass = () => undefined;

describe('Pac-Man ghost contact', () => {
	it('an active ghost kills, a frightened one is eaten', () => {
		const active = classicContact(on(3, 3), false, [ghost('BLINKY', 3, 3, 'active')], noPass);
		expect(active).toMatchObject({ kind: 'death', enraged: false });
		const scared = classicContact(on(3, 3), false, [ghost('PINKY', 3, 3, 'frightened')], noPass);
		expect(scared).toMatchObject({ kind: 'eat' });
	});

	it('eyes and ghosts in the lair never touch; invulnerability ignores everything', () => {
		const ghosts = [ghost('INKY', 3, 3, 'eyes'), ghost('CLYDE', 3, 3, 'lair')];
		expect(classicContact(on(3, 3), false, ghosts, noPass)).toBeNull();
		expect(classicContact(on(3, 3), true, [ghost('BLINKY', 3, 3, 'active')], noPass)).toBeNull();
	});

	it('the first touching ghost decides, far ones are reported as passes', () => {
		const onPass = vi.fn();
		const far = ghost('BLINKY', 10, 3, 'active');
		const near = ghost('PINKY', 3, 3, 'frightened');
		const contact = classicContact(on(3, 3), false, [far, near], onPass);
		expect(contact).toMatchObject({ kind: 'eat', ghost: near });
		expect(onPass).toHaveBeenCalledWith(far, 49);
	});

	it('a ghost one tile away does not touch', () => {
		expect(classicContact(on(4, 3), false, [ghost('BLINKY', 3, 3, 'active')], noPass)).toBeNull();
	});
});

describe('Ms. Pac-Man ghost contact', () => {
	it('hypnotised ghosts, eyes and the lair never touch', () => {
		const ghosts = (['hypnotized', 'eyes', 'lair', 'exiting'] as const).map((s) =>
			ghost('BLINKY', 3, 3, s)
		);
		expect(msContact(on(3, 3), false, false, ghosts)).toBeNull();
	});

	it('during the overdrive any touch goes to the hypnosis, even when invulnerable', () => {
		const g = ghost('INKY', 3, 3, 'active');
		expect(msContact(on(3, 3), true, true, [g])).toMatchObject({ kind: 'overdrive', ghost: g });
	});

	it('an enraged ghost kills and says so; invulnerability protects', () => {
		const g = ghost('CLYDE', 3, 3, 'enraged');
		expect(msContact(on(3, 3), false, false, [g])).toMatchObject({ kind: 'death', enraged: true });
		expect(msContact(on(3, 3), true, false, [g])).toBeNull();
	});
});
