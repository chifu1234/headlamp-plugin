import { Box, Card, CardContent, Chip, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { Cell, Pie, PieChart } from "recharts";

export interface StatSegment {
	name: string;
	value: number;
	color: string;
}

export interface StatChip {
	label: string;
	color?: "default" | "success" | "warning" | "error" | "primary" | "info";
}

export interface StatCardProps {
	/** Small uppercase caption shown at the top of the card. */
	label: string;
	/** The large headline value. */
	total: ReactNode;
	/** Donut-pie segments. When their sum is 0 the empty label is shown instead. */
	segments?: StatSegment[];
	/** Summary chips rendered under the pie. */
	chips?: StatChip[];
	/** Optional footer node (e.g. helper caption). */
	footer?: ReactNode;
	/** Pixel size of the pie. Defaults to 56. */
	pieSize?: number;
	/** Stretch the card to fill its grid cell height. */
	fullHeight?: boolean;
	/** Text shown when there is nothing to chart. Defaults to "None". */
	emptyLabel?: string;
}

/**
 * Reusable summary tile: caption + headline number + readiness donut + chips.
 * Replaces the stat-card/pie blocks that were copy-pasted across the overview,
 * tenant list, quota lists and tenant-resource stats.
 */
export function StatCard({
	label,
	total,
	segments = [],
	chips = [],
	footer,
	pieSize = 56,
	fullHeight = false,
	emptyLabel = "None",
}: StatCardProps) {
	const sum = segments.reduce((acc, s) => acc + (s.value || 0), 0);
	const innerRadius = Math.round(pieSize * 0.3);
	const outerRadius = Math.round(pieSize * 0.46);

	return (
		<Card variant="outlined" sx={fullHeight ? { height: "100%" } : undefined}>
			<CardContent>
				<Typography color="text.secondary" variant="caption">
					{label}
				</Typography>
				<Typography variant="h4">{total}</Typography>

				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						mt: 1,
						minHeight: 56,
					}}
				>
					{sum > 0 ? (
						<PieChart width={pieSize} height={pieSize}>
							<Pie
								data={segments}
								dataKey="value"
								nameKey="name"
								cx="50%"
								cy="50%"
								innerRadius={innerRadius}
								outerRadius={outerRadius}
							>
								{segments.map((entry, index) => (
									<Cell key={`cell-${index}`} fill={entry.color} />
								))}
							</Pie>
						</PieChart>
					) : (
						<Typography variant="caption" color="text.secondary">
							{emptyLabel}
						</Typography>
					)}
				</Box>

				{chips.length > 0 && (
					<Box
						sx={{
							mt: 0.5,
							display: "flex",
							gap: 0.5,
							flexWrap: "wrap",
							justifyContent: "center",
						}}
					>
						{chips.map((c, i) => (
							<Chip key={i} size="small" label={c.label} color={c.color} />
						))}
					</Box>
				)}

				{footer}
			</CardContent>
		</Card>
	);
}

export default StatCard;
