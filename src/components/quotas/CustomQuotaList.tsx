import {
	Link,
	ResourceListView,
} from "@kinvolk/headlamp-plugin/lib/CommonComponents";
import { Chip, Grid, Typography } from "@mui/material";
import { useMemo } from "react";
import { CustomQuota } from "../../resources/customQuotas";
import { usagePercent } from "../../utils/quantity";
import { QuotaUsage } from "../common/QuotaUsage";
import { StatCard } from "../common/StatCard";

export function CustomQuotasList() {
	const [items] = CustomQuota.useList();

	const health = useMemo(() => {
		let healthy = 0;
		let warning = 0;
		let critical = 0;
		(items || []).forEach((item) => {
			const p = usagePercent(item.status?.usage?.used, item.spec?.limit);
			if (p > 90) critical++;
			else if (p > 70) warning++;
			else healthy++;
		});
		const total = items?.length || 0;
		return { healthy, warning, critical, total };
	}, [items]);

	return (
		<>
			<Grid container spacing={2} sx={{ mb: 2 }}>
				<Grid item xs={12} sm={6} md={4}>
					<StatCard
						label="CUSTOM QUOTAS"
						total={health.total}
						segments={[
							{ name: "Healthy", value: health.healthy, color: "#4caf50" },
							{ name: "Warning", value: health.warning, color: "#ff9800" },
							{ name: "Critical", value: health.critical, color: "#f44336" },
						]}
						chips={[
							{ label: `${health.healthy} Healthy`, color: "success" },
							{ label: `${health.warning} Warning`, color: "warning" },
							{ label: `${health.critical} Critical`, color: "error" },
						]}
						footer={
							<Typography
								variant="caption"
								color="text.secondary"
								sx={{ display: "block", mt: 0.5 }}
							>
								Based on usage % (healthy &lt;70%)
							</Typography>
						}
					/>
				</Grid>
			</Grid>

			<ResourceListView
				title="Custom Quotas"
				resourceClass={CustomQuota}
				columns={[
					{
						id: "name",
						label: "Name",
						getValue: (item) => item.getName(),
						render: (item) => (
							<Link
								routeName="customquota"
								params={{
									namespace: item.getNamespace(),
									name: item.getName(),
								}}
							>
								{item.getName()}
							</Link>
						),
					},
					"namespace",
					{
						id: "limit",
						label: "Limit",
						getValue: (item) => item.spec?.limit || "",
					},
					{
						id: "used",
						label: "Used",
						getValue: (item) => item.status?.usage?.used || "0",
						render: (item) => (
							<QuotaUsage
								used={item.status?.usage?.used}
								limit={item.spec?.limit}
								size={18}
							/>
						),
					},
					{
						id: "available",
						label: "Available",
						getValue: (item) => item.status?.usage?.available || "",
					},
					{
						id: "sources",
						label: "Sources",
						getValue: (item) => (item.spec?.sources || []).length,
						render: (item) => {
							const count = (item.spec?.sources || []).length;
							return (
								<Chip
									size="small"
									label={`${count} source${count === 1 ? "" : "s"}`}
								/>
							);
						},
					},
					"age",
				]}
			/>
		</>
	);
}
