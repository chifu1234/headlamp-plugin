import { K8s } from '@kinvolk/headlamp-plugin/lib';
import { Link, ResourceListView, SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Grid, Typography } from '@mui/material';
import { useMemo } from 'react';
import { CustomQuota, GlobalCustomQuota } from '../../resources/customQuotas';
import {
  getAppliedObjectsForTable,
  getManagedObjectReadyStatus,
  GlobalTenantResource,
  isResourceReady,
  TenantResource,
} from '../../resources/tenantResources';
import { Tenants } from '../../resources/tenants';
import { getTenantSpaces, isSpaceReady } from '../../utils/tenantSpaces';
import { useFetchedResources } from '../common/ManagedResources';
import { StatCard } from '../common/StatCard';
import { tenantColumns } from '../tenants/TenantList';

export function CapsuleOverview() {
  const [tenants, tenantsError] = Tenants.useList();
  const [gQuotas] = GlobalCustomQuota.useList();
  const [cQuotas] = CustomQuota.useList();
  const [gTRs] = GlobalTenantResource.useList();
  const [tTRs] = TenantResource.useList();

  const allManagedApplied = useMemo(() => {
    const fromGlobal = (gTRs || []).flatMap((r: any) => getAppliedObjectsForTable(r));
    const fromTenant = (tTRs || []).flatMap((r: any) => getAppliedObjectsForTable(r));
    return [...fromGlobal, ...fromTenant];
  }, [gTRs, tTRs]);

  const managedObjects = useFetchedResources(allManagedApplied);

  const [allNS, nsError] = K8s.ResourceClasses.Namespace.useList();

  const stats = useMemo(() => {
    const numTenants = tenants?.length || 0;
    let active = 0;
    let cordoned = 0;
    tenants?.forEach((t: any) => {
      const state = t.status?.state || t.jsonData?.status?.state || '';
      const isCordoned = !!t.jsonData?.spec?.cordoned || state.toLowerCase() === 'cordoned';
      if (isCordoned) {
        cordoned++;
      } else {
        active++;
      }
    });

    const managedNS =
      allNS?.filter((ns: any) => {
        const labels = ns.jsonData?.metadata?.labels || {};
        return !!labels['capsule.clastix.io/tenant'];
      }).length || 0;

    const numCQuotas = cQuotas?.length || 0;
    const numTR = tTRs?.length || 0;

    let nsReady = 0;
    let nsNotReady = 0;
    tenants?.forEach(t => {
      getTenantSpaces(t).forEach(sp => {
        if (isSpaceReady(sp)) nsReady++;
        else nsNotReady++;
      });
    });

    const gQuotasList = gQuotas || [];
    const gqReady = gQuotasList.filter((q: any) => isResourceReady(q)).length;
    const gqNotReady = gQuotasList.length - gqReady;

    const gtrReadyCount = (gTRs || []).filter((r: any) => isResourceReady(r)).length;
    const trReadyCount = (tTRs || []).filter((r: any) => isResourceReady(r)).length;
    const trCRReady = gtrReadyCount + trReadyCount;
    const trCRTotal = (gTRs?.length || 0) + (tTRs?.length || 0);
    const trCRNotReady = trCRTotal - trCRReady;

    let moReady = 0;
    let moNotReady = 0;
    let moUnknown = 0;
    (managedObjects || []).forEach((obj: any) => {
      if (!obj?.metadata?.creationTimestamp) {
        moUnknown++;
        return;
      }
      const statusInfo = getManagedObjectReadyStatus(obj, allManagedApplied);
      if (statusInfo.color === 'success' || statusInfo.label.toLowerCase() === 'true') {
        moReady++;
      } else if (statusInfo.color === 'error') {
        moNotReady++;
      } else {
        moUnknown++;
      }
    });

    return {
      numTenants,
      active,
      cordoned,
      managedNS,
      numCQuotas,
      numTR,
      nsReady,
      nsNotReady,
      gqReady,
      gqNotReady,
      gqTotal: gQuotasList.length,
      trCRReady,
      trCRNotReady,
      trCRTotal,
      moReady,
      moNotReady,
      moUnknown,
      moTotal: managedObjects?.length || 0,
    };
  }, [tenants, allNS, gQuotas, cQuotas, gTRs, tTRs, managedObjects]);

  const recentTenants = useMemo(() => (tenants || []).slice(0, 6), [tenants]);

  return (
    <>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Capsule
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Overview of your Capsule multi-tenancy installation. Use the tenant selector in the top bar
        to scope the UI.
      </Typography>

      {/* Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            label="TENANTS"
            total={stats.numTenants}
            fullHeight
            pieSize={50}
            segments={[
              { name: 'Active', value: stats.active, color: '#4caf50' },
              { name: 'Cordoned', value: stats.cordoned, color: '#ff9800' },
            ]}
            chips={[
              { label: `${stats.active} Active`, color: 'success' },
              { label: `${stats.cordoned} Cordoned`, color: 'warning' },
            ]}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            label="MANAGED NAMESPACES"
            total={stats.nsReady + stats.nsNotReady}
            fullHeight
            pieSize={50}
            segments={[
              { name: 'Ready', value: stats.nsReady, color: '#4caf50' },
              { name: 'Not Ready', value: stats.nsNotReady, color: '#f44336' },
            ]}
            chips={[
              { label: `${stats.nsReady} Ready`, color: 'success' },
              { label: `${stats.nsNotReady} Not Ready` },
            ]}
            footer={
              <Typography variant="body2" color="text.secondary">
                Across all tenants
              </Typography>
            }
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            label="GLOBAL QUOTAS"
            total={stats.gqTotal}
            fullHeight
            pieSize={50}
            segments={[
              { name: 'Ready', value: stats.gqReady, color: '#4caf50' },
              { name: 'Not Ready', value: stats.gqNotReady, color: '#f44336' },
            ]}
            chips={[
              { label: `${stats.gqReady} Ready`, color: 'success' },
              { label: `${stats.gqNotReady} Not Ready` },
            ]}
            footer={
              <Typography variant="body2" color="text.secondary">
                + {stats.numCQuotas} namespaced Custom Quotas
              </Typography>
            }
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            label="TENANT RESOURCES"
            total={stats.trCRTotal}
            fullHeight
            pieSize={50}
            segments={[
              { name: 'Ready', value: stats.trCRReady, color: '#4caf50' },
              {
                name: 'Not Ready',
                value: stats.trCRNotReady,
                color: '#f44336',
              },
            ]}
            chips={[
              { label: `${stats.trCRReady} Ready`, color: 'success' },
              { label: `${stats.trCRNotReady} Not Ready` },
            ]}
            footer={
              <Typography variant="body2" color="text.secondary">
                Global + Tenant-scoped
              </Typography>
            }
          />
        </Grid>

        {/* Managed Resources */}
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            label="MANAGED RESOURCES"
            total={stats.moTotal}
            fullHeight
            pieSize={50}
            segments={[
              {
                name: 'Ready',
                value: stats.moReady + stats.moUnknown,
                color: '#4caf50',
              },
              { name: 'Not Ready', value: stats.moNotReady, color: '#f44336' },
            ]}
            chips={[
              {
                label: `${stats.moReady + stats.moUnknown} Ready`,
                color: 'success',
              },
              { label: `${stats.moNotReady} Not Ready` },
              ...(stats.moUnknown > 0
                ? [
                    {
                      label: `${stats.moUnknown} Unknown`,
                      color: 'success' as const,
                    },
                  ]
                : []),
            ]}
            footer={
              <Typography variant="body2" color="text.secondary">
                Global + Tenant-scoped
              </Typography>
            }
          />
        </Grid>
      </Grid>

      {/* Tenants */}
      <SectionBox title="Tenants">
        {tenantsError && (
          <Typography color="error" sx={{ mb: 1 }}>
            Error loading tenants: {tenantsError.message || String(tenantsError)}
          </Typography>
        )}
        {nsError && (
          <Typography color="error" sx={{ mb: 1 }}>
            Error loading namespaces.
          </Typography>
        )}

        {recentTenants.length === 0 && !tenantsError ? (
          <Typography color="text.secondary">
            No tenants found. Create your first Tenant to get started.
          </Typography>
        ) : (
          <>
            <ResourceListView
              title=""
              data={recentTenants}
              headerProps={{
                noSearch: true,
                noNamespaceFilter: true,
              }}
              reflectInURL={false}
              columns={tenantColumns}
            />
            <Typography sx={{ mt: 1.5 }}>
              <Link routeName="tenants">View all tenants →</Link>
            </Typography>
          </>
        )}
      </SectionBox>
    </>
  );
}
