/**
 * Kubernetes resource-quantity helpers shared across the quota views.
 *
 * Centralizes the (previously component-local) parsing logic so that every
 * quota usage/limit calculation uses the exact same, unit-aware implementation.
 */

/**
 * Parses a Kubernetes resource quantity string into a numeric value.
 * Supports:
 *  - milli (m) for CPU: "500m" => 0.5
 *  - binary: Ki, Mi, Gi, Ti, Pi, Ei (and lowercase variants)
 *  - decimal: k, M, G, T, P, E (and some lowercase)
 *  - exponent forms: 1e3, 1E6 etc.
 *  - bare numbers
 *
 * Returns the value in "base units" so that ratios between used/limit (which
 * always use the same unit for a given quota) are correct.
 */
export function parseKubernetesQuantity(
	q: string | number | null | undefined,
): number {
	if (q === null || q === undefined) return 0;
	const str = String(q).trim();
	if (!str || str === "0") return 0;

	const match = str.match(/^([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)([a-zA-Z]*)$/);
	if (!match) {
		return parseFloat(str) || 0;
	}

	const value = parseFloat(match[1]);
	const suffix = match[2];
	if (!suffix) return value;

	// Milli (CPU) - lowercase m only
	if (suffix === "m") {
		return value / 1000;
	}

	// Binary prefixes (Ki/Mi/...). Support common casings.
	const binary: Record<string, number> = {
		Ki: 1024,
		ki: 1024,
		KI: 1024,
		Mi: 1024 ** 2,
		mi: 1024 ** 2,
		Gi: 1024 ** 3,
		gi: 1024 ** 3,
		Ti: 1024 ** 4,
		ti: 1024 ** 4,
		Pi: 1024 ** 5,
		pi: 1024 ** 5,
		Ei: 1024 ** 6,
		ei: 1024 ** 6,
	};
	if (binary[suffix]) {
		return value * binary[suffix];
	}

	// Decimal prefixes (k/M/G/...). M is uppercase for mega.
	const decimal: Record<string, number> = {
		k: 1000,
		K: 1000,
		M: 1000 ** 2,
		G: 1000 ** 3,
		g: 1000 ** 3,
		T: 1000 ** 4,
		P: 1000 ** 5,
		E: 1000 ** 6,
	};
	if (decimal[suffix]) {
		return value * decimal[suffix];
	}

	// Unknown suffix: fall back to the numeric part
	return value;
}

/** Usage as a percentage (0-100, not clamped) of `used` against `limit`. */
export function usagePercent(
	used: string | number | null | undefined,
	limit: string | number | null | undefined,
): number {
	const u = parseKubernetesQuantity(used);
	const l = parseKubernetesQuantity(limit) || 1;
	return l > 0 ? (u / l) * 100 : 0;
}

/** Hex color for a usage percentage (green <70%, orange 70-90%, red >90%). */
export function usageHex(percent: number): string {
	return percent > 90 ? "#f44336" : percent > 70 ? "#ff9800" : "#4caf50";
}

/** MUI Chip color for a usage percentage. */
export function usageChipColor(
	percent: number,
): "error" | "warning" | "success" {
	return percent > 90 ? "error" : percent > 70 ? "warning" : "success";
}
