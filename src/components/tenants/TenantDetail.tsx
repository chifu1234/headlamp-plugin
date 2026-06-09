import { Icon } from '@iconify/react';
import { K8s } from '@kinvolk/headlamp-plugin/lib';
import { Link, ResourceListView, SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Resource, { SimpleTable } from '@kinvolk/headlamp-plugin/lib/components/common';
import { Alert, AlertTitle, Avatar, Box, Chip, Grid, IconButton, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import { Tenants } from '../../resources/tenants';
import { getTenantIcon, getTenantLinks, safeUrl } from '../../utils/tenantMeta';
import { NamespaceCordonAction } from '../common/ReconcileActions';

export interface TenantProps {
  name?: string;
}

export function TenantDetail(props: TenantProps) {
  const params = useParams<{ name: string }>();
  const { name = params.name } = props;
  const [showNotes, setShowNotes] = useState(false);
  const [showClasses, setShowClasses] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Fetch tenant for info table extra fields (lightweight)
  const [tenants, tenantsError] = Tenants.useList();
  const tenant = useMemo(() => tenants?.find((t: any) => t.getName() === name), [tenants, name]);

  // Additional lists for other sub components if needed in future

  const nsVal = tenant?.status?.namespaces ?? tenant?.jsonData?.status?.namespaces;
  const numNamespaces = typeof nsVal === 'number' ? nsVal : nsVal?.length ?? 0;
  const state = tenant?.status?.state || tenant?.jsonData?.status?.state || 'Active';
  const owners = tenant?.spec?.owners || tenant?.jsonData?.spec?.owners || [];

  // Banner as sticky acknowledgeable notification
  useEffect(() => {
    if (!tenant) return;
    const banner =
      tenant.infoBanner ||
      tenant.jsonData?.metadata?.annotations?.['info.projectcapsule.dev/banner'];
    if (!banner) {
      setBannerDismissed(false);
      return;
    }
    const dismissed = localStorage.getItem(`banner-dismissed-${name}`);
    if (dismissed === banner) {
      setBannerDismissed(true);
    } else {
      setBannerDismissed(false);
    }
  }, [name, tenant]);

  return (
    <>
      {tenantsError && (
        <Typography color="error" sx={{ mb: 2 }}>
          Error loading Tenant details: {tenantsError.message || String(tenantsError)}. Is the
          Capsule CRD present and do you have list permission?
        </Typography>
      )}

      {/* Banner */}
      {(() => {
        const banner =
          tenant?.infoBanner ||
          tenant?.jsonData?.metadata?.annotations?.['info.projectcapsule.dev/banner'];
        if (!banner || bannerDismissed) return null;
        return (
          <Alert
            severity="warning"
            sx={{ position: 'sticky', top: 0, zIndex: 1200, mb: 2 }}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => {
                  localStorage.setItem(`banner-dismissed-${name}`, banner);
                  setBannerDismissed(true);
                }}
                sx={{ fontSize: '1rem' }}
              >
                ×
              </IconButton>
            }
          >
            <AlertTitle>Tenant Notice</AlertTitle>
            {banner}
          </Alert>
        );
      })()}

      {/* Logo + name header */}
      {(() => {
        const icon = getTenantIcon(tenant);
        if (!icon) return null;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar
              src={safeUrl(icon)}
              sx={{
                width: 48,
                height: 48,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: 1,
              }}
            />
            <Typography variant="h6" sx={{ fontWeight: 500 }}>
              {name}
            </Typography>
          </Box>
        );
      })()}

      <Resource.DetailsGrid
        name={name}
        resourceType={Tenants}
        withEvents
        title=""
        extraInfo={item => {
          if (!item) return [];
          const extra = [
            {
              name: 'State',
              value: (
                <Chip
                  label={state}
                  color={state === 'Active' ? 'success' : 'warning'}
                  size="small"
                />
              ),
            },
            {
              name: 'Namespaces (from status)',
              value: <Typography component="span">{numNamespaces} namespace(s)</Typography>,
            },
            {
              name: 'Owners',
              value:
                owners.length > 0
                  ? owners.map((o: any, idx: number) => (
                      <Chip
                        key={idx}
                        size="small"
                        label={`${o.name} (${o.kind || 'User'})`}
                        sx={{ mr: 0.5, mb: 0.25 }}
                      />
                    ))
                  : '—',
            },
          ];
          const description =
            item.infoDescription ||
            item.jsonData?.metadata?.annotations?.['info.projectcapsule.dev/description'];
          if (description) {
            extra.push({
              name: 'Description',
              value: <Typography>{description}</Typography>,
            } as any);
          }

          // Links in extraInfo (parsing centralized + sanitized)
          const links = getTenantLinks(item);
          if (links.length > 0) {
            extra.push({
              name: 'Links',
              value: (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {links.map((link: any, i: number) => {
                    const href = safeUrl(link.url);
                    const iconSrc = safeUrl(link.icon);
                    return (
                      <Chip
                        key={i}
                        label={link.title || link.url}
                        component={href ? 'a' : 'span'}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        icon={
                          iconSrc ? (
                            <img
                              src={iconSrc}
                              style={{
                                width: 18,
                                height: 18,
                                objectFit: 'contain',
                              }}
                              alt=""
                            />
                          ) : link.icon ? (
                            Icon && typeof Icon === 'function' ? (
                              <Icon icon={link.icon} style={{ fontSize: 18 }} />
                            ) : undefined
                          ) : undefined
                        }
                        sx={{
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          height: 28,
                          bgcolor: 'action.hover',
                        }}
                        onClick={e => e.stopPropagation()}
                      />
                    );
                  })}
                </Box>
              ),
            } as any);
          }

          return extra;
        }}
      />

      {/* Notes */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          mt: 2,
          mb: 1,
        }}
        onClick={() => setShowNotes(!showNotes)}
      >
        {showNotes ? '▼' : '▶'} {showNotes ? 'Hide' : 'Show'} cordoning notes
      </Typography>

      {showNotes && (
        <Box
          sx={{
            mb: 2,
            p: 1,
            bgcolor: 'action.hover',
            borderRadius: 1,
            fontSize: '0.8rem',
          }}
        >
          <Typography variant="caption" display="block">
            Cordoning prevents tenant owners from modifying resources in the tenant's namespaces.
            Use the Cordon action in the resource header above.
          </Typography>
        </Box>
      )}

      {/* Conditions */}
      <SectionBox title="Conditions">
        {!tenant?.status?.conditions || tenant.status.conditions.length === 0 ? (
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
            data={tenant.status.conditions}
            emptyMessage="No conditions."
            reflectInURL={false}
          />
        )}
      </SectionBox>

      {/* Classes */}
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="subtitle2"
          sx={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
          onClick={() => setShowClasses(!showClasses)}
        ></Typography>
        {showClasses && (
          <Box sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              {tenant?.spec?.nodeSelector && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Node Selector
                  </Typography>
                  <Box
                    sx={{
                      p: 1,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      whiteSpace: 'pre',
                      overflow: 'auto',
                    }}
                  >
                    {JSON.stringify(tenant.spec.nodeSelector, null, 2)}
                  </Box>
                </Grid>
              )}
              {tenant?.spec?.storageClasses && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Allowed Storage Classes
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(
                      (tenant.spec.storageClasses as any).allowed ||
                      (Array.isArray(tenant.spec.storageClasses) ? tenant.spec.storageClasses : [])
                    ).map((sc: string, i: number) => (
                      <Chip key={i} label={sc} size="small" />
                    ))}
                    {(tenant.spec.storageClasses as any).allowedRegex && (
                      <Chip
                        label={`Regex: ${(tenant.spec.storageClasses as any).allowedRegex}`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Grid>
              )}
              {tenant?.spec?.ingressClasses && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Allowed Ingress Classes
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {((tenant.spec.ingressClasses as any).allowed || []).map(
                      (ic: string, i: number) => (
                        <Chip key={i} label={ic} size="small" />
                      )
                    )}
                  </Box>
                </Grid>
              )}
              {/* Extend classes */}
            </Grid>
          </Box>
        )}
      </Box>

      {/* Namespaces overview */}
      <TenantNamespacesOverview tenant={tenant} />
    </>
  );
}

function LabelsCell({ labels }: { labels: Record<string, string> }) {
  const [expanded, setExpanded] = useState(false);
  const labelEntries = Object.entries(labels);
  if (labelEntries.length === 0) return '—';
  const displayEntries = expanded ? labelEntries : labelEntries.slice(0, 2);
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.25,
        alignItems: 'center',
      }}
    >
      {displayEntries.map(([key, value], i) => (
        <Chip key={i} size="small" label={`${key}=${value}`} sx={{ fontSize: '0.65rem' }} />
      ))}
      {labelEntries.length > 2 && (
        <Chip
          size="small"
          label={expanded ? 'show less' : `+${labelEntries.length - 2} more`}
          onClick={e => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          clickable
          variant="outlined"
          sx={{ fontSize: '0.65rem', cursor: 'pointer' }}
        />
      )}
    </Box>
  );
}

function TenantNamespacesOverview({ tenant }: { tenant?: any }) {
  const [allNamespaces] = K8s.ResourceClasses.Namespace.useList();

  const tenantNamespaces = useMemo(() => {
    if (!allNamespaces || !tenant) return [];
    const spaces = tenant.status?.spaces || tenant.jsonData?.status?.spaces || {};
    let spaceNames: string[] = [];
    if (spaces && typeof spaces === 'object') {
      if (Array.isArray(spaces)) {
        spaceNames = spaces.map((s: any) => (typeof s === 'string' ? s : s?.name)).filter(Boolean);
      } else {
        spaceNames = Object.keys(spaces);
      }
    }
    if (spaceNames.length === 0) return [];
    const nameSet = new Set(spaceNames);
    return allNamespaces.filter((ns: any) => nameSet.has(ns.getName()));
  }, [allNamespaces, tenant]);

  return (
    <ResourceListView
      title="Namespaces"
      data={tenantNamespaces}
      headerProps={{
        noSearch: false,
        noNamespaceFilter: true,
      }}
      reflectInURL={false}
      enableRowActions
      actions={[
        {
          id: 'cordon-namespace',
          action: ({ item, closeMenu }: any) => (
            <NamespaceCordonAction item={item} closeMenu={closeMenu} buttonStyle="menu" />
          ),
        },
      ]}
      columns={[
        {
          id: 'name',
          label: 'Name',
          getValue: (item: any) => item.getName(),
          render: (item: any) => <NamespaceLink nsName={item.getName()} />,
        },
        {
          id: 'phase',
          label: 'Phase',
          getValue: (item: any) => item.jsonData?.status?.phase || 'Active',
          render: (item: any) => {
            const phase = item.jsonData?.status?.phase || 'Active';
            return (
              <Chip size="small" label={phase} color={phase === 'Active' ? 'success' : 'warning'} />
            );
          },
        },
        {
          id: 'ready-message',
          label: 'Ready Message',
          getValue: (item: any) => {
            const nsName = item.getName();
            const spaces = tenant?.status?.spaces || tenant?.jsonData?.status?.spaces || {};
            let spaceInfo: any = null;
            if (spaces && typeof spaces === 'object') {
              if (spaces[nsName]) {
                spaceInfo = spaces[nsName];
              } else {
                const arr = Array.isArray(spaces) ? spaces : Object.values(spaces);
                spaceInfo = arr.find((s: any) => s && (s.name === nsName || s === nsName));
              }
            }
            if (spaceInfo && spaceInfo.conditions?.length > 0) {
              const cond =
                spaceInfo.conditions.find(
                  (c: any) =>
                    c.type === 'Ready' ||
                    c.type?.includes('Ready') ||
                    c.type?.toLowerCase().includes('ready')
                ) || spaceInfo.conditions[0];
              return cond.message || cond.reason || cond.status || '—';
            }
            const conditions = item.jsonData?.status?.conditions || [];
            if (conditions.length > 0) {
              const ready =
                conditions.find((c: any) => c.type?.toLowerCase().includes('ready')) ||
                conditions[0];
              return ready.message || ready.reason || ready.status || '—';
            }
            return item.jsonData?.status?.phase || '—';
          },
          render: (item: any) => {
            const nsName = item.getName();
            const spaces = tenant?.status?.spaces || tenant?.jsonData?.status?.spaces || {};
            let spaceInfo: any = null;
            if (spaces && typeof spaces === 'object') {
              if (spaces[nsName]) {
                spaceInfo = spaces[nsName];
              } else {
                const arr = Array.isArray(spaces) ? spaces : Object.values(spaces);
                spaceInfo = arr.find((s: any) => s && (s.name === nsName || s === nsName));
              }
            }
            if (spaceInfo?.conditions?.length) {
              const cond =
                spaceInfo.conditions.find(
                  (c: any) =>
                    c.type === 'Ready' ||
                    c.type?.includes('Ready') ||
                    c.type?.toLowerCase().includes('ready')
                ) || spaceInfo.conditions[0];
              const label =
                cond.message || cond.reason || `${cond.type || 'Ready'}: ${cond.status}`;
              return (
                <Chip
                  size="small"
                  label={label}
                  color={cond.status === 'True' ? 'success' : 'default'}
                />
              );
            }
            const conditions = item.jsonData?.status?.conditions || [];
            if (conditions.length > 0) {
              const cond =
                conditions.find((c: any) => c.type?.toLowerCase().includes('ready')) ||
                conditions[0];
              const label =
                cond.message || cond.reason || `${cond.type || 'Ready'}: ${cond.status}`;
              return (
                <Chip
                  size="small"
                  label={label}
                  color={cond.status === 'True' ? 'success' : 'default'}
                />
              );
            }
            const phase = item.jsonData?.status?.phase || 'Active';
            return (
              <Chip size="small" label={phase} color={phase === 'Active' ? 'success' : 'warning'} />
            );
          },
        },
        // {
        // 	id: "cordoned",
        // 	label: "Cordoned",
        // 	getValue: (item: any) => {
        // 		const l = item.jsonData?.metadata?.labels || {};
        // 		return l["projectcapsule.dev/cordoned"] === "true" ? "Yes" : "No";
        // 	},
        // 	render: (item: any) => {
        // 		const cord =
        // 			item.jsonData?.metadata?.labels?.[
        // 				"projectcapsule.dev/cordoned"
        // 			] === "true";
        // 		return (
        // 			<Chip
        // 				size="small"
        // 				label={cord ? "Cordoned" : "Active"}
        // 				color={cord ? "warning" : "success"}
        // 			/>
        // 		);
        // 	},
        // },
        {
          id: 'labels',
          label: 'Labels',
          getValue: (item: any) => {
            const labels = item.jsonData?.metadata?.labels || {};
            // Return a searchable string so the table filter/search works on label keys and values
            return Object.entries(labels)
              .map(([k, v]) => `${k}=${v}`)
              .join(' ');
          },
          render: (item: any) => <LabelsCell labels={item.jsonData?.metadata?.labels || {}} />,
        },
        'age',
      ]}
    />
  );
}

function NamespaceLink({ nsName }: { nsName: string }) {
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

  const handleClick = () => {
    // Also set the global filter (like the tenant selector does).
    // This ensures the UI is scoped to this ns (in addition to the navigation).
    setNsFilter([nsName]);
  };

  return (
    <Link routeName="namespace" params={{ name: nsName }} onClick={handleClick}>
      {nsName}
    </Link>
  );
}
