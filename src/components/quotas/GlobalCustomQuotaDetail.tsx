import {
	Link,
	SectionBox,
} from "@kinvolk/headlamp-plugin/lib/CommonComponents";
import Resource, {
	SimpleTable,
} from "@kinvolk/headlamp-plugin/lib/components/common";
import { Box, Chip, Tooltip, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import { Cell, Pie, PieChart } from "recharts";
import { GlobalCustomQuota } from "../../resources/customQuotas";
import { parseKubernetesQuantity, usageHex } from "../../utils/quantity";
import { QuotaClaims } from "../common/QuotaClaims";

export interface GlobalCustomQuotaDetailProps {
	name?: string;
}

export function GlobalCustomQuotaDetail(props: GlobalCustomQuotaDetailProps) {
	const params = useParams<{ name: string }>();
	const { name = params.name } = props;

	const [quotas] = GlobalCustomQuota.useList();
	const quota = quotas?.find((q: any) => q.getName() === name);
	const cluster = quota?.cluster;

	return (
		<>
			<Resource.DetailsGrid
				name={name}
				resourceType={GlobalCustomQuota}
				withEvents
				extraInfo={(item) => {
					if (!item) return [];
					const limit = item.spec?.limit || "—";
					const used = item.status?.usage?.used || "0";
					const available = item.status?.usage?.available || "—";
					const numSources = (item.spec?.sources || []).length;
					const numNamespaces = (item.status?.namespaces || []).length;
					const uVal = parseKubernetesQuantity(used);
					const lVal = parseKubernetesQuantity(limit) || 1;
					const p = lVal > 0 ? (uVal / lVal) * 100 : 0;
					return [
						{ name: "Limit", value: <Typography>{limit}</Typography> },
						{
							name: "Used",
							value: (
								<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
									<Typography>{used}</Typography>
									<Tooltip
										title={`${p.toFixed(1)}% of limit (green &lt;70%, orange 70-90%, red &gt;90%)`}
									>
										<Box>
											{(() => {
												const pieData = [
													{
														name: "Used",
														value: uVal,
														fill: usageHex(p),
													},
													{
														name: "Remaining",
														value: Math.max(0, lVal - uVal),
														fill: "#e0e0e0",
													},
												];
												return (
													<PieChart width={28} height={28}>
														<Pie
															data={pieData}
															dataKey="value"
															nameKey="name"
															cx="50%"
															cy="50%"
															innerRadius={8}
															outerRadius={13}
														>
															{pieData.map((entry, index) => (
																<Cell key={`cell-${index}`} fill={entry.fill} />
															))}
														</Pie>
													</PieChart>
												);
											})()}
										</Box>
									</Tooltip>
								</Box>
							),
						},
						{ name: "Available", value: <Typography>{available}</Typography> },
						{
							name: "Sources",
							value: <Chip size="small" label={numSources} />,
						},
						{
							name: "Namespaces in scope",
							value: <Typography>{numNamespaces}</Typography>,
						},
					];
				}}
			/>

			<GlobalCustomQuotaSources name={name} />
			<QuotaClaims quota={quota} cluster={cluster} />
			<GlobalCustomQuotaConditions name={name} />
			<GlobalCustomQuotaNamespaces name={name} />
		</>
	);
}

function GlobalCustomQuotaSources({ name }: { name: string }) {
	const [quotas] = GlobalCustomQuota.useList();
	const quota = quotas?.find((q: any) => q.getName() === name);
	const sources = quota?.spec?.sources || [];

	return (
		<SectionBox title="Sources">
			{sources.length === 0 ? (
				<Typography color="text.secondary">No sources defined.</Typography>
			) : (
				<SimpleTable
					columns={[
						{
							label: "Group",
							getter: (s) => s.group || "core",
						},
						{
							label: "Version",
							getter: (s) => s.version || "v1",
						},
						{
							label: "Kind",
							getter: (s) => s.kind,
						},
						{
							label: "Operation",
							getter: (s) => s.op,
						},
						{
							label: "Path",
							getter: (s) => s.path || "—",
						},
					]}
					data={sources}
					emptyMessage="No sources defined."
					reflectInURL={false}
				/>
			)}
		</SectionBox>
	);
}

function GlobalCustomQuotaNamespaces({ name }: { name: string }) {
	const [quotas] = GlobalCustomQuota.useList();
	const quota = quotas?.find((q: any) => q.getName() === name);
	const namespaces = quota?.status?.namespaces || [];
	const cluster = quota?.cluster;

	return (
		<SectionBox title="Namespaces in scope">
			{namespaces.length === 0 ? (
				<Typography color="text.secondary">
					No namespaces selected yet (or no namespaceSelectors).
				</Typography>
			) : (
				<SimpleTable
					columns={[
						{
							label: "Namespace",
							getter: (row: { ns: string }) => {
								const ns = row.ns;
								return (
									<Link
										routeName="namespace"
										params={{ name: ns }}
										activeCluster={cluster}
										tooltip
									>
										{ns}
									</Link>
								);
							},
						},
					]}
					data={namespaces.map((ns: string) => ({ ns }))}
					emptyMessage="No namespaces selected."
					reflectInURL={false}
				/>
			)}
		</SectionBox>
	);
}

function GlobalCustomQuotaConditions({ name }: { name: string }) {
	const [quotas] = GlobalCustomQuota.useList();
	const quota = quotas?.find((q: any) => q.getName() === name);
	const conds = quota?.status?.conditions || [];
	return (
		<SectionBox title="Conditions">
			{conds.length === 0 ? (
				<Typography color="text.secondary">No conditions.</Typography>
			) : (
				<SimpleTable
					columns={[
						{ label: "Type", getter: (c: any) => c.type },
						{
							label: "Status",
							getter: (c: any) => (
								<Chip
									label={c.status}
									color={c.status === "True" ? "success" : "default"}
									size="small"
								/>
							),
						},
						{ label: "Reason", getter: (c: any) => c.reason || "—" },
						{ label: "Message", getter: (c: any) => c.message || "—" },
						{
							label: "Last Transition",
							getter: (c: any) =>
								c.lastTransitionTime
									? new Date(c.lastTransitionTime).toLocaleString()
									: "—",
						},
					]}
					data={conds}
					emptyMessage="No conditions."
					reflectInURL={false}
				/>
			)}
		</SectionBox>
	);
}
