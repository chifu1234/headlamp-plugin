import { ApiProxy, K8s } from '@kinvolk/headlamp-plugin/lib';
import { Dialog, Link, SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { DateLabel, SimpleTable } from '@kinvolk/headlamp-plugin/lib/components/common';
import type { KubeObject, KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/lib/k8s/cluster';
import { makeCustomResourceClass } from '@kinvolk/headlamp-plugin/lib/lib/k8s/crd';
import { Box, Chip, Typography } from '@mui/material';
import React from 'react';
import {
  getAppliedObjectsForTable,
  getManagedObjectReadyStatus,
  getPlural,
} from '../../resources/tenantResources';

/**
 * Aligns with Flux's GetResourcesFromInventory pattern:
 * - Accept a list of target resources (our "applied" from status).
 * - For each, parse GVK + identity, make a (possibly dynamic) resource class, apiGet it.
 * - Collect fetched KubeObjects (or stubs on error) into state.
 * - Render a simple table over the fetched list (Name, Namespace, Kind, Ready, Age).
 *
 * The Capsule-specific "item" wrapper and SSA inspect panel live in ManagedResources below.
 */

function parseTarget(entry: any): {
  group: string;
  version: string;
  kind: string;
  name: string;
  namespace?: string;
  apiVersion: string;
} {
  const apiVersion = entry?.apiVersion || 'v1';
  const slash = apiVersion.indexOf('/');
  const group = slash > 0 ? apiVersion.substring(0, slash) : '';
  const version = slash > 0 ? apiVersion.substring(slash + 1) : apiVersion;
  return {
    group,
    version,
    kind: entry?.kind || '',
    name: entry?.name || '',
    namespace: entry?.namespace || undefined,
    apiVersion,
  };
}

function inventoryNameLink(item: KubeObject) {
  // No creationTimestamp means we only have a stub (fetch failed or not yet applied).
  if (!item?.metadata?.creationTimestamp) {
    return item?.metadata?.name || '';
  }

  const kind = item.kind;
  const json: KubeObjectInterface = item.jsonData || (item as any);
  const apiVersion: string = json?.apiVersion || (item as any)?.apiVersion || 'v1';
  const slashIndex = apiVersion.lastIndexOf('/');
  const groupName = slashIndex > 0 ? apiVersion.substring(0, slashIndex) : apiVersion;
  const pluralName = getPlural(kind);

  // CRD
  if (kind === 'CustomResourceDefinition') {
    return (
      <Link routeName="crd" params={{ name: item.metadata.name }}>
        {item.metadata.name}
      </Link>
    );
  }

  // Standard k8s types via ResourceClasses
  const resourceKind = (K8s as any).ResourceClasses?.[kind];
  if (resourceKind) {
    try {
      const resource = new resourceKind(item.jsonData || item);
      if (resource?.getDetailsLink?.()) {
        return <Link kubeObject={resource}>{item.metadata.name}</Link>;
      }
    } catch {
      // fall through to plain name
    }
    return item.metadata.name;
  }

  // Custom resources
  return (
    <Link
      routeName="customresource"
      params={{
        crName: item.metadata.name,
        crd: `${pluralName}.${groupName}`,
        namespace: item.metadata.namespace || '-',
      }}
    >
      {item.metadata.name}
    </Link>
  );
}

/** Hook that fetches live KubeObjects (or stubs on error) for a list of applied descriptors.
 *  Reusable for tables and aggregate stats. Mirrors Flux inventory fetching.
 */
export function useFetchedResources(applied: any[]): KubeObject[] {
  const [resources, setResources] = React.useState<KubeObject[]>([]);

  React.useEffect(() => {
    setResources([]);
    (applied || []).forEach((entry: any) => {
      const t = parseTarget(entry);
      if (!t.kind || !t.name) return;

      const builtIn = (K8s as any).ResourceClasses?.[t.kind];
      const doGet = (rc: any) => {
        rc.apiGet(
          (data: KubeObject) => {
            setResources(prev => {
              if (prev.find(r => r.metadata?.uid === data?.metadata?.uid)) return prev;
              return [...prev, data];
            });
          },
          t.name,
          t.namespace,
          () => {
            // stub like Flux does when the object isn't queryable
            const stub: any = {
              metadata: { name: t.name, namespace: t.namespace },
              kind: t.kind,
              apiVersion: t.apiVersion,
            };
            setResources(prev => [...prev, stub as KubeObject]);
          }
        )();
      };

      if (builtIn) {
        doGet(builtIn);
      } else {
        const rc = makeCustomResourceClass({
          kind: t.kind,
          apiInfo: [{ group: t.group, version: t.version }],
          isNamespaced: !!t.namespace,
          singularName: t.kind.toLowerCase(),
          pluralName: getPlural(t.kind),
        });
        doGet(rc);
      }
    });
  }, [applied]);

  return resources;
}

export interface GetResourcesFromAppliedProps {
  applied: any[];
  /** Optional extra columns (e.g. Capsule "Inspect SSA") appended after the standard Flux-like columns. */
  extraColumns?: any[];
}

export function GetResourcesFromApplied({ applied, extraColumns }: GetResourcesFromAppliedProps) {
  const resources = useFetchedResources(applied);

  const baseColumns = [
    { label: 'Name', getter: item => inventoryNameLink(item) },
    { label: 'Namespace', getter: item => item?.metadata?.namespace || '' },
    { label: 'Kind', getter: item => item?.kind || '' },
    {
      label: 'Ready',
      getter: item => {
        const statusInfo = getManagedObjectReadyStatus(item, applied || []);
        const color =
          statusInfo.color === 'success'
            ? 'success'
            : statusInfo.color === 'error'
            ? 'error'
            : 'default';
        return <Chip label={statusInfo.label} color={color} size="small" />;
      },
    },
    {
      label: 'Age',
      getter: item => {
        const ts = item?.metadata?.creationTimestamp;
        return ts ? <DateLabel date={ts} /> : '';
      },
    },
  ];

  return (
    <SimpleTable
      columns={[...baseColumns, ...(extraColumns || [])]}
      data={resources}
      emptyMessage="No managed resources."
      reflectInURL={false}
    />
  );
}

function isManagedField(fieldsV1: any, key: string) {
  if (!fieldsV1 || typeof fieldsV1 !== 'object') return false;
  if (Object.keys(fieldsV1).length === 0) {
    // Empty object in fieldsV1 means the entire subtree (this key and all its descendants)
    // is managed by this SSA owner. Common for whole lists/objects like spec.limits: {}
    return true;
  }
  const fKey = `f:${key}`;
  return (
    Object.prototype.hasOwnProperty.call(fieldsV1, fKey) ||
    Object.prototype.hasOwnProperty.call(fieldsV1, key)
  );
}

function getSubFieldsV1(fieldsV1: any, key: string) {
  if (!fieldsV1 || typeof fieldsV1 !== 'object') return null;
  if (Object.keys(fieldsV1).length === 0) {
    // Propagate "fully managed subtree" down to children
    return {};
  }
  const fKey = `f:${key}`;
  return fieldsV1[fKey] || fieldsV1[key] || null;
}

function renderYAMLWithSSAHighlight(obj: any, fieldsV1: any, level = 0): React.ReactNode {
  const elements: React.ReactNode[] = [];
  const indent = '  '.repeat(level);
  const isArray = Array.isArray(obj);

  if (obj === null || obj === undefined) {
    elements.push(
      <div key="null" style={{ whiteSpace: 'pre', color: '#888' }}>
        {indent}null
      </div>
    );
    return elements;
  }

  if (typeof obj !== 'object') {
    elements.push(
      <div key="val" style={{ whiteSpace: 'pre' }}>
        {indent}
        {JSON.stringify(obj)}
      </div>
    );
    return elements;
  }

  if (isArray) {
    obj.forEach((item: any, index: number) => {
      const managed = isManagedField(fieldsV1, '');
      const lineStyle: React.CSSProperties = {
        whiteSpace: 'pre',
        color: managed ? '#4ec9b0' : '#d4d4d4',
        fontWeight: managed ? 'bold' : 'normal',
        backgroundColor: managed ? 'rgba(78, 201, 176, 0.1)' : 'transparent',
      };
      elements.push(
        <div key={index} style={lineStyle}>
          {indent}-{' '}
          {typeof item === 'object' && item !== null
            ? renderYAMLWithSSAHighlight(item, getSubFieldsV1(fieldsV1, ''), level + 1)
            : JSON.stringify(item)}
          {managed && <span style={{ color: '#4ec9b0', marginLeft: 4 }}>★</span>}
        </div>
      );
    });
  } else {
    Object.entries(obj).forEach(([key, value]) => {
      if (key === 'managedFields') {
        return; // hide raw managedFields as requested
      }
      const managed = isManagedField(fieldsV1, key);
      const subV1 = getSubFieldsV1(fieldsV1, key);
      const keyColor = managed ? '#4ec9b0' : '#9cdcfe'; // VSCode-like
      const lineStyle: React.CSSProperties = {
        whiteSpace: 'pre',
        backgroundColor: managed ? 'rgba(78, 201, 176, 0.1)' : 'transparent',
      };

      elements.push(
        <div key={key} style={lineStyle}>
          {indent}
          <span style={{ color: keyColor, fontWeight: managed ? 'bold' : 'normal' }}>{key}:</span>
          {value && typeof value === 'object' ? null : (
            <span
              style={{
                color: typeof value === 'string' ? '#ce9178' : '#b5cea8',
              }}
            >
              {' '}
              {JSON.stringify(value)}
            </span>
          )}
          {managed && (
            <span style={{ color: '#4ec9b0', marginLeft: 6, fontSize: '0.8em' }}>★ SSA</span>
          )}
        </div>
      );

      if (value && typeof value === 'object') {
        const children = renderYAMLWithSSAHighlight(value, subV1, level + 1);
        elements.push(...(Array.isArray(children) ? children : [children]));
      }
    });
  }

  return elements;
}

/**
 * ManagedResources is the Capsule-facing component used by the two detail views.
 * It extracts the applied list from the TenantResource/GlobalTenantResource and
 * delegates the live fetch + table to GetResourcesFromApplied (Flux Inventory style).
 * It also provides the Capsule-specific "Inspect SSA" action + panel.
 */
export interface ManagedResourcesProps {
  item?: any;
  title?: string;
}

export function ManagedResources({ item, title = 'Managed Resources' }: ManagedResourcesProps) {
  const applied = React.useMemo(() => getAppliedObjectsForTable(item), [item]);

  // SSA inspect state (Capsule-specific).
  // We inspect the managedFields of the live object and select the entry for the
  // "resource" (replication) itself. Capsule uses a *hashed* manager for each
  // specific resource entry in a TenantResource (via getFieldOwner(TR ns/name) +
  // ResourceID.FieldOwner in the processor). We explicitly avoid the special
  // "projectcapsule.dev/resource/controller" manager.
  const [selected, setSelected] = React.useState<any>(null);
  const [fetchedObj, setFetchedObj] = React.useState<any>(null);
  const [selectedFieldsV1, setSelectedFieldsV1] = React.useState<any>(null);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!selected) {
      setFetchedObj(null);
      setSelectedFieldsV1(null);
      setFetchError(null);
      return;
    }
    setFetchError(null);
    setFetchedObj(null);
    setSelectedFieldsV1(null);

    const apiVersion = selected.apiVersion || selected.jsonData?.apiVersion || 'v1';
    const kind = selected.kind;
    const objName = selected.name || selected.metadata?.name;
    const objNs = selected.namespace || selected.metadata?.namespace;

    const prefix =
      apiVersion === 'v1' || !apiVersion.includes('/') ? '/api/v1' : `/apis/${apiVersion}`;

    const plural = getPlural(kind);
    let url = prefix;
    if (objNs) url += `/namespaces/${objNs}`;
    url += `/${plural}/${objName}`;

    ApiProxy.request(url)
      .then((obj: any) => {
        setFetchedObj(obj);
        const mfs: any[] = obj?.metadata?.managedFields || [];

        // Only interested in managed fields from "the resource itself".
        // Capsule registers per-resource ownership using a *hashed* manager name
        // (getFieldOwner(TR) + ResourceID.FieldOwner("") from Capsule's replication processor).
        // The controller uses the special "projectcapsule.dev/resource/controller".
        // We want the hashed one for this specific resource entry, not the controller.
        let match = mfs.find((mf: any) => {
          const mgr = (mf.manager || '').toLowerCase();
          const isController =
            mgr === 'projectcapsule.dev/resource/controller' ||
            mgr.endsWith('/resource/controller') ||
            mgr.includes('/resource/controller');
          return mf.operation === 'Apply' && !isController;
        });
        if (!match && mfs.length > 0) {
          // Fallback: first Apply that is not the controller, or just the first one
          match =
            mfs.find((mf: any) => {
              const mgr = (mf.manager || '').toLowerCase();
              const isController =
                mgr === 'projectcapsule.dev/resource/controller' ||
                mgr.endsWith('/resource/controller');
              return mf.operation === 'Apply' && !isController;
            }) ||
            mfs.find((mf: any) => mf.operation === 'Apply') ||
            mfs[0];
        }
        const f1 = match ? match.fieldsV1 || match : null;
        setSelectedFieldsV1(f1);
      })
      .catch((err: any) => setFetchError(err?.message || String(err)));
  }, [selected]);

  function clearSelection() {
    setSelected(null);
    setSelectedFieldsV1(null);
  }

  // Inspect action for a fetched (or stub) KubeObject row
  function inspectFor(item: KubeObject) {
    const apiVersion = (item as any)?.apiVersion || item?.jsonData?.apiVersion || 'v1';
    setSelected({
      apiVersion,
      kind: item?.kind,
      name: item?.metadata?.name,
      namespace: item?.metadata?.namespace,
    });
  }

  if (!applied || applied.length === 0) {
    return (
      <SectionBox title={title}>
        <Typography color="text.secondary">No managed resources reported yet.</Typography>
      </SectionBox>
    );
  }

  return (
    <SectionBox title={title}>
      <GetResourcesFromApplied
        applied={applied}
        extraColumns={[
          {
            label: 'SSA',
            getter: (item: KubeObject) => (
              <Typography
                component="span"
                sx={{
                  cursor: 'pointer',
                  color: 'primary.main',
                  textDecoration: 'underline',
                  fontSize: '0.8rem',
                }}
                onClick={() => inspectFor(item)}
              >
                Inspect
              </Typography>
            ),
          },
        ]}
      />

      {selected && (
        <Dialog
          open
          onClose={clearSelection}
          title={`SSA Inspect: ${selected.kind} ${
            selected.namespace ? `${selected.namespace}/` : ''
          }${selected.name}`}
          maxWidth="lg"
          fullWidth
        >
          {fetchError && <Typography color="error">Error fetching object: {fetchError}</Typography>}
          {!fetchedObj && !fetchError && (
            <Typography color="text.secondary">
              Loading object to inspect SSA ownership...
            </Typography>
          )}

          {/* VS Code-style editor view for the live object, highlighting SSA-managed fields */}
          {fetchedObj && selectedFieldsV1 && (
            <Box
              sx={{
                border: '1px solid #3c3c3c',
                borderRadius: 1,
                overflow: 'hidden',
                bgcolor: '#1e1e1e',
                fontFamily: 'Consolas, "Courier New", Menlo, monospace',
                fontSize: '0.78rem',
                lineHeight: 1.4,
                color: '#d4d4d4',
              }}
            >
              {/* VS Code tab bar */}
              <Box
                sx={{
                  bgcolor: '#252526',
                  px: 1.5,
                  py: 0.25,
                  fontSize: '0.7rem',
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: '1px solid #3c3c3c',
                  color: '#cccccc',
                }}
              >
                <span>live-object.yaml</span>
                <Box
                  sx={{
                    ml: 1,
                    px: 0.75,
                    py: 0.1,
                    bgcolor: '#4ec9b0',
                    color: '#1e1e1e',
                    fontSize: '0.6rem',
                    borderRadius: 0.5,
                    fontWeight: 600,
                  }}
                >
                  SSA
                </Box>
                <Box sx={{ flex: 1 }} />
                <Typography variant="caption" sx={{ color: '#888', fontSize: '0.6rem' }}>
                  green + ★ = fields managed by this SSA resource
                </Typography>
              </Box>

              {/* Code content with YAML and SSA highlights */}
              <Box
                sx={{
                  p: 1,
                  overflow: 'auto',
                  maxHeight: 420,
                  whiteSpace: 'pre',
                }}
              >
                {renderYAMLWithSSAHighlight(fetchedObj, selectedFieldsV1)}
              </Box>
            </Box>
          )}
        </Dialog>
      )}
    </SectionBox>
  );
}

export default ManagedResources;
