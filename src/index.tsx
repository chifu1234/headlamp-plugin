import {
	registerAppBarAction,
	registerDetailsViewHeaderAction,
	registerRoute,
	registerSidebarEntry,
} from "@kinvolk/headlamp-plugin/lib";
import { RESOURCE_DEFINITIONS } from "@kinvolk/headlamp-plugin/lib/CommonComponents";
import {
	GlobalTenantResourceReconcileAction,
	NamespaceCordonAction,
	TenantCordonAction,
	TenantResourceReconcileAction,
} from "./components/common/ReconcileActions";
import { CapsuleOverview } from "./components/overview/CapsuleOverview";
import CreateCustomQuotaForm from "./components/quotas/CreateCustomQuotaForm";
import CreateGlobalCustomQuotaForm from "./components/quotas/CreateGlobalCustomQuotaForm";
import { CustomQuotaDetail } from "./components/quotas/CustomQuotaDetail";
import { CustomQuotasList } from "./components/quotas/CustomQuotaList";
import { GlobalCustomQuotaDetail } from "./components/quotas/GlobalCustomQuotaDetail";
import { GlobalCustomQuotasList } from "./components/quotas/GlobalCustomQuotaList";
import CreateGlobalTenantResourceForm from "./components/tenant-resources/CreateGlobalTenantResourceForm";
import CreateTenantResourceForm from "./components/tenant-resources/CreateTenantResourceForm";
import { GlobalTenantResourceDetail } from "./components/tenant-resources/GlobalTenantResourceDetail";
import { GlobalTenantResourcesList } from "./components/tenant-resources/GlobalTenantResourceList";
import { TenantResourceDetail } from "./components/tenant-resources/TenantResourceDetail";
import { TenantResourcesList } from "./components/tenant-resources/TenantResourceList";
import CreateTenantForm from "./components/tenants/CreateTenantForm";
import { TenantBox } from "./components/tenants/TenantBox";
import { TenantDetail } from "./components/tenants/TenantDetail";
import { TenantLinksBar } from "./components/tenants/TenantLinksBar";
import { TenantsList } from "./components/tenants/TenantList";
import { CustomQuota, GlobalCustomQuota } from "./resources/customQuotas";
import {
	GlobalTenantResource,
	TenantResource,
} from "./resources/tenantResources";
import { Tenants } from "./resources/tenants";

registerAppBarAction(<TenantBox />);
registerAppBarAction(<TenantLinksBar />);

registerSidebarEntry({
	parent: "",
	name: "capsule",
	label: "Capsule",
	icon: "mdi:account-group",
	url: "/capsule/overview/",
});

registerSidebarEntry({
	parent: "capsule",
	name: "overview",
	label: "Overview",
	icon: "mdi:view-dashboard",
	url: "/capsule/overview/",
});

registerSidebarEntry({
	parent: "capsule",
	name: "tenants",
	label: "Tenants",
	icon: "mdi:account-group",
	url: "/capsule/tenants/",
});

registerSidebarEntry({
	parent: "capsule",
	name: "global-custom-quotas",
	label: "Global Custom Quotas",
	icon: "mdi:chart-bar-stacked",
	url: "/capsule/global-custom-quotas/",
});

registerSidebarEntry({
	parent: "capsule",
	name: "custom-quotas",
	label: "Custom Quotas",
	icon: "mdi:chart-pie",
	url: "/capsule/custom-quotas/",
});

registerSidebarEntry({
	parent: "capsule",
	name: "global-tenant-resources",
	label: "Global Tenant Resources",
	icon: "mdi:file-document-multiple",
	url: "/capsule/global-tenant-resources/",
});

registerSidebarEntry({
	parent: "capsule",
	name: "tenant-resources",
	label: "Tenant Resources",
	icon: "mdi:file-document",
	url: "/capsule/tenant-resources/",
});

registerRoute({
	path: "/capsule/overview/",
	sidebar: "overview",
	name: "capsule-overview",
	component: () => <CapsuleOverview />,
	exact: true,
});

registerRoute({
	path: "/capsule/tenants/",
	sidebar: "tenants",
	name: "tenants",
	component: () => <TenantsList />,
	exact: true,
});

registerRoute({
	path: "/capsule/tenants/:name",
	sidebar: "tenants",
	name: "tenant",
	component: () => {
		return <TenantDetail />;
	},
	exact: true,
});

registerRoute({
	path: "/capsule/global-custom-quotas/",
	sidebar: "global-custom-quotas",
	name: "globalcustomquotas",
	component: () => <GlobalCustomQuotasList />,
	exact: true,
});

registerRoute({
	path: "/capsule/global-custom-quotas/:name",
	sidebar: "global-custom-quotas",
	name: "globalcustomquota",
	component: () => <GlobalCustomQuotaDetail />,
	exact: true,
});

registerRoute({
	path: "/capsule/custom-quotas/",
	sidebar: "custom-quotas",
	name: "customquotas",
	component: () => <CustomQuotasList />,
	exact: true,
});

registerRoute({
	path: "/capsule/custom-quotas/:namespace/:name",
	sidebar: "custom-quotas",
	name: "customquota",
	component: () => <CustomQuotaDetail />,
	exact: true,
});

registerRoute({
	path: "/capsule/global-tenant-resources/",
	sidebar: "global-tenant-resources",
	name: "globaltenantresources",
	component: () => <GlobalTenantResourcesList />,
	exact: true,
});

registerRoute({
	path: "/capsule/global-tenant-resources/:name",
	sidebar: "global-tenant-resources",
	name: "globaltenantresource",
	component: () => <GlobalTenantResourceDetail />,
	exact: true,
});

registerRoute({
	path: "/capsule/tenant-resources/",
	sidebar: "tenant-resources",
	name: "tenantresources",
	component: () => <TenantResourcesList />,
	exact: true,
});

registerRoute({
	path: "/capsule/tenant-resources/:namespace/:name",
	sidebar: "tenant-resources",
	name: "tenantresource",
	component: () => <TenantResourceDetail />,
	exact: true,
});

registerDetailsViewHeaderAction(NamespaceCordonAction);

registerDetailsViewHeaderAction(TenantCordonAction);
registerDetailsViewHeaderAction(TenantResourceReconcileAction);
registerDetailsViewHeaderAction(GlobalTenantResourceReconcileAction);

(RESOURCE_DEFINITIONS as any).Tenant = {
	class: Tenants,
	form: CreateTenantForm,
};
(RESOURCE_DEFINITIONS as any).GlobalCustomQuota = {
	class: GlobalCustomQuota,
	form: CreateGlobalCustomQuotaForm,
};
(RESOURCE_DEFINITIONS as any).CustomQuota = {
	class: CustomQuota,
	form: CreateCustomQuotaForm,
};
(RESOURCE_DEFINITIONS as any).GlobalTenantResource = {
	class: GlobalTenantResource,
	form: CreateGlobalTenantResourceForm,
};
(RESOURCE_DEFINITIONS as any).TenantResource = {
	class: TenantResource,
	form: CreateTenantResourceForm,
};
