import { K8s } from '@kinvolk/headlamp-plugin/lib';
import { Link, SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Resource, { SimpleTable } from '@kinvolk/headlamp-plugin/lib/components/common';
import { Box, Chip, Typography } from '@mui/material';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import {
  getAppliedCount,
  getDefinedReplicationEntries,
  getPlural,
  getSpecResourcesCount,
  TenantResource,
} from '../../resources/tenantResources';
import { ManagedResources } from '../common/ManagedResources';

export interface TenantResourceDetailProps {
  name?: string;
  namespace?: string;
}

export function TenantResourceDetail(props: TenantResourceDetailProps) {
  const params = useParams<{ namespace: string; name: string }>();
  const { name = params.name, namespace = params.namespace } = props;

  const [list, listError] = TenantResource.useList();
  const tenantResourceItem = useMemo(
    () =>
      list?.find(
        (q: any) => q.getName() === name && (!namespace || q.getNamespace() === namespace)
      ),
    [list, name, namespace]
  );

  return (
    <>
      {listError && (
        <Typography color="error" sx={{ mb: 2 }}>
          Error loading TenantResource: {listError.message || String(listError)}. Is the Capsule CRD
          present and do you have list permission?
        </Typography>
      )}

      <Resource.DetailsGrid
        name={name}
        namespace={namespace}
        resourceType={TenantResource}
        withEvents
        extraInfo={item => {
          if (!item) return [];
          const numSpecResources = getSpecResourcesCount(item);
          const numStatusResources = getAppliedCount(item);
          return [
            {
              name: 'Resource Rules',
              value: <Chip size="small" label={numSpecResources} />,
            },
            {
              name: 'Replicated Items',
              value: <Chip size="small" label={numStatusResources} />,
            },
            {
              name: 'Resync Period',
              value: (
                <Typography>
                  {item.spec?.resyncPeriod || item.jsonData?.spec?.resyncPeriod || '—'}
                </Typography>
              ),
            },
          ];
        }}
      />

      <TenantResourceConditions name={name} namespace={namespace} item={tenantResourceItem} />
      <TenantResourceDefinedResources name={name} namespace={namespace} item={tenantResourceItem} />
      <ManagedResources item={tenantResourceItem} title="Managed Resources" />
    </>
  );
}

function TenantResourceConditions({
  name,
  namespace,
  item: providedItem,
}: {
  name: string;
  namespace?: string;
  item?: any;
}) {
  const [list] = TenantResource.useList();
  const item =
    providedItem ||
    list?.find((q: any) => q.getName() === name && (!namespace || q.getNamespace() === namespace));
  const conditions = item?.status?.conditions || item?.jsonData?.status?.conditions || [];

  return (
    <SectionBox title="Conditions">
      {conditions.length === 0 ? (
        <Typography color="text.secondary">No conditions.</Typography>
      ) : (
        <SimpleTable
          columns={[
            { label: 'Type', getter: (c: any) => c.type },
            {
              label: 'Status',
              getter: (c: any) => (
                <Chip
                  label={c.status}
                  color={c.status === 'True' ? 'success' : 'default'}
                  size="small"
                />
              ),
            },
            { label: 'Reason', getter: (c: any) => c.reason || '—' },
            { label: 'Message', getter: (c: any) => c.message || '—' },
            {
              label: 'Last Transition',
              getter: (c: any) =>
                c.lastTransitionTime ? new Date(c.lastTransitionTime).toLocaleString() : '—',
            },
          ]}
          data={conditions}
          emptyMessage="No conditions."
          reflectInURL={false}
        />
      )}
    </SectionBox>
  );
}
function TenantResourceDefinedResources({
  name,
  namespace,
  item: providedItem,
}: {
  name: string;
  namespace?: string;
  item?: any;
}) {
  const [list] = TenantResource.useList();
  const item =
    providedItem ||
    list?.find((q: any) => q.getName() === name && (!namespace || q.getNamespace() === namespace));
  const spec = item?.spec || item?.jsonData?.spec || {};
  const rules = spec.resources || [];
  const definedEntries: any[] = getDefinedReplicationEntries(rules);

  const dispatch = useDispatch();
  const setNsFilter = useCallback(
    (namespaces: string[] | null) => {
      if (namespaces && namespaces.length > 0) {
        dispatch({ type: 'filter/setNamespaceFilter', payload: namespaces });
      } else {
        dispatch({ type: 'filter/setNamespaceFilter', payload: [] });
      }
    },
    [dispatch]
  );

  // Group by kind

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    definedEntries.forEach((r: any) => {
      const key = r.kind || 'Unknown';
      if (!g[key]) g[key] = [];
      g[key].push(r);
    });
    return g;
  }, [definedEntries]);

  if (definedEntries.length === 0) {
    return (
      <SectionBox title="Defined Resources">
        <Typography color="text.secondary">No resources defined in spec.</Typography>
      </SectionBox>
    );
  }

  return (
    <SectionBox title="Defined Resources">
      {Object.entries(grouped).map(([kind, kindResources]) => (
        <Box key={kind} sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
            {kind} ({kindResources.length})
          </Typography>
          <SimpleTable
            columns={[
              {
                label: 'Name',
                getter: (r: any) => {
                  const display = r.name || '—';
                  if (
                    !r.name ||
                    !r.kind ||
                    r.kind === 'Generator' ||
                    r.kind === 'Rule' ||
                    r.kind === 'Raw'
                  ) {
                    return display;
                  }

                  const builtIn = (K8s as any).ResourceClasses?.[r.kind];
                  if (builtIn) {
                    try {
                      const synthetic = {
                        apiVersion: r.apiVersion || 'v1',
                        kind: r.kind,
                        metadata: {
                          name: r.name,
                          namespace: r.namespace || undefined,
                        },
                      };
                      const res = new builtIn(synthetic);
                      if (res?.getDetailsLink?.()) {
                        return <Link kubeObject={res}>{display}</Link>;
                      }
                    } catch {}
                    return display;
                  }

                  // Custom resource fallback
                  const apiVersion = r.apiVersion || 'v1';
                  const group = apiVersion.includes('/') ? apiVersion.split('/')[0] : '';
                  const plural = getPlural(r.kind);
                  return (
                    <Link
                      routeName="customresource"
                      params={{
                        crName: r.name,
                        crd: `${plural}.${group}`,
                        namespace: r.namespace || '-',
                      }}
                      onClick={() => {
                        if (r.namespace) setNsFilter([r.namespace]);
                      }}
                    >
                      {display}
                    </Link>
                  );
                },
              },
              {
                label: 'Namespace (source)',
                getter: (r: any) => r.namespace || '—',
              },
              {
                label: 'Selector',
                getter: (r: any) => {
                  if (r.selector) return JSON.stringify(r.selector);
                  if (r.labelSelector) return JSON.stringify(r.labelSelector);
                  if (r.fieldSelector) return r.fieldSelector;
                  return '—';
                },
              },
              {
                label: 'API Version',
                getter: (r: any) => r.apiVersion || 'v1',
              },
              {
                label: 'Sync Options',
                getter: (r: any) => (r.syncOptions ? 'force' : '—'),
              },
            ]}
            data={kindResources}
            emptyMessage="No defined entries for this kind."
            reflectInURL={false}
          />
        </Box>
      ))}
    </SectionBox>
  );
}
