import {
	Link,
	ResourceListView,
} from "@kinvolk/headlamp-plugin/lib/CommonComponents";
import { Chip } from "@mui/material";
import {
	getAppliedCount,
	getSpecResourcesCount,
	GlobalTenantResource,
} from "../../resources/tenantResources";
import { GlobalTenantResourceReconcileAction } from "../common/ReconcileActions";
import { TenantResourcesStats } from "../common/TenantResourcesStats";

export function GlobalTenantResourcesList() {
	const [items] = GlobalTenantResource.useList();

	return (
		<>
			<TenantResourcesStats items={items || []} scope="global" />
			<ResourceListView
				title="Global Tenant Resources"
				resourceClass={GlobalTenantResource}
				enableRowActions
				actions={[
					{
						id: "force-reconcile",
						action: ({ item, closeMenu }: any) => (
							<GlobalTenantResourceReconcileAction
								item={item}
								closeMenu={closeMenu}
								buttonStyle="menu"
							/>
						),
					},
				]}
				columns={[
					{
						id: "name",
						label: "Name",
						getValue: (item) => item.getName(),
						render: (item) => (
							<Link
								routeName="globaltenantresource"
								params={{ name: item.getName() }}
							>
								{item.getName()}
							</Link>
						),
					},
					{
						id: "resources",
						label: "Resources",
						getValue: (item) => getSpecResourcesCount(item),
						render: (item) => {
							const count = getSpecResourcesCount(item);
							return (
								<Chip
									size="small"
									label={`${count} resource${count === 1 ? "" : "s"}`}
								/>
							);
						},
					},
					{
						id: "statusResources",
						label: "Replicated",
						getValue: (item) => getAppliedCount(item),
						render: (item) => {
							const count = getAppliedCount(item);
							return (
								<Chip
									size="small"
									label={`${count} object${count === 1 ? "" : "s"}`}
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
