export type TeleportType = `0${string}`;

export const TILE_TOKENS = [
	'WL',
	'DT',
	'EU',
	'ES',
	'FL',
	'LE',
	'LT',
	'PM',
	'BY',
	'PY',
	'IY',
	'CE',
	'FT',
	'DB'
] as const;

export type TileType = (typeof TILE_TOKENS)[number] | TeleportType;

export type GridMatrix = readonly (readonly TileType[])[];

const TOKEN_SET: ReadonlySet<string> = new Set<string>(TILE_TOKENS);

export function isTeleportToken(token: string): token is TeleportType {
	return token.length === 2 && token.charAt(0) === '0';
}

export function isTileToken(token: string): token is TileType {
	return TOKEN_SET.has(token) || isTeleportToken(token);
}

export const SECRET_LEVEL_NUMBER = 99;

export const HELL_LEVEL_INTERVAL = 5;
