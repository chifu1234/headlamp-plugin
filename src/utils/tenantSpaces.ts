/**
 * Helpers for reading Capsule tenant `status.spaces` (namespace) readiness.
 *
 * Capsule reports per-namespace state under `tenant.status.spaces`, which may be
 * either a map keyed by namespace name or an array. The same normalization and
 * "is this namespace ready?" logic was previously duplicated in CapsuleOverview,
 * TenantList and TenantDetail.
 */

export interface SpaceCondition {
	type?: string;
	status?: string | boolean;
	reason?: string;
	message?: string;
	lastTransitionTime?: string;
}

export interface SpaceInfo {
	name?: string;
	conditions?: SpaceCondition[];
	[key: string]: unknown;
}

function rawSpaces(tenant: any): Record<string, any> | any[] {
	return tenant?.status?.spaces || tenant?.jsonData?.status?.spaces || {};
}

/** Normalizes `status.spaces` into a list of `{ name, ...info }` entries. */
export function getTenantSpaces(tenant: any): SpaceInfo[] {
	const spaces = rawSpaces(tenant);
	if (!spaces || typeof spaces !== "object") return [];
	if (Array.isArray(spaces)) {
		return spaces.map((s: any) =>
			typeof s === "string" ? { name: s } : (s as SpaceInfo),
		);
	}
	return Object.entries(spaces).map(([name, info]) =>
		info && typeof info === "object"
			? { name, ...(info as SpaceInfo) }
			: { name },
	);
}

/** The namespace names managed by a tenant (from `status.spaces`). */
export function getTenantSpaceNames(tenant: any): string[] {
	return getTenantSpaces(tenant)
		.map((s) => s.name)
		.filter((n): n is string => Boolean(n));
}

/** Looks up the space entry for a given namespace name. */
export function findSpaceInfo(
	tenant: any,
	nsName: string,
): SpaceInfo | undefined {
	const spaces = rawSpaces(tenant);
	if (spaces && typeof spaces === "object" && !Array.isArray(spaces)) {
		const direct = (spaces as Record<string, any>)[nsName];
		if (direct) return { name: nsName, ...direct };
	}
	return getTenantSpaces(tenant).find((s) => s.name === nsName) as
		| SpaceInfo
		| undefined;
}

/** Finds the Ready condition (or the first condition) of a space entry. */
export function findReadyCondition(
	spaceInfo: SpaceInfo | undefined,
): SpaceCondition | undefined {
	const conditions = spaceInfo?.conditions || [];
	if (conditions.length === 0) return undefined;
	return (
		conditions.find(
			(c) =>
				c.type === "Ready" ||
				(typeof c.type === "string" && c.type.toLowerCase().includes("ready")),
		) || conditions[0]
	);
}

/** True when the space reports a Ready=True condition. */
export function isSpaceReady(spaceInfo: SpaceInfo | undefined): boolean {
	const conditions = spaceInfo?.conditions || [];
	const cond = conditions.find(
		(c) =>
			c.type === "Ready" ||
			(typeof c.type === "string" && c.type.toLowerCase().includes("ready")),
	);
	return !!(cond && (cond.status === "True" || cond.status === true));
}
