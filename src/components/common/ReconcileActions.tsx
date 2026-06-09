import { ApiProxy } from '@kinvolk/headlamp-plugin/lib';
import { ActionButton } from '@kinvolk/headlamp-plugin/lib/components/common';
import { useSnackbar } from 'notistack';
import { useState } from 'react';

export function TenantResourceReconcileAction(props: any) {
  const { enqueueSnackbar } = useSnackbar();

  let resource = props.item || props.resource;
  if (!resource) return null;
  // tolerate being passed the call object { item, closeMenu } directly
  if (resource.item && !resource.jsonData && !resource.kind) resource = resource.item;

  const json = resource.jsonData || {};
  const kind =
    json.kind || resource.kind || (resource.constructor && (resource.constructor as any).kind);
  const apiVersion =
    json.apiVersion ||
    resource.apiVersion ||
    (resource.constructor && (resource.constructor as any).apiVersion);

  if (kind !== 'TenantResource' || !apiVersion?.startsWith('capsule.clastix.io/')) {
    return null;
  }
  const handleReconcile = async () => {
    try {
      const name = resource.getName
        ? resource.getName()
        : resource.jsonData?.metadata?.name || resource.metadata?.name;
      const ns = resource.getNamespace
        ? resource.getNamespace()
        : resource.jsonData?.metadata?.namespace || resource.metadata?.namespace;
      if (!ns) {
        enqueueSnackbar('Cannot determine namespace for TenantResource', {
          variant: 'error',
        });
        return;
      }
      const patchUrl = `/apis/capsule.clastix.io/v1beta2/namespaces/${ns}/tenantresources/${name}`;
      const ts = new Date().toISOString();
      const patchBody = {
        metadata: {
          annotations: {
            'reconcile.projectcapsule.dev/requestedAt': ts,
          },
        },
      };
      await ApiProxy.patch(patchUrl, patchBody);
      enqueueSnackbar(`Reconcile requested for TenantResource ${name}`, {
        variant: 'success',
      });
      if (props.closeMenu) props.closeMenu();
    } catch (err: any) {
      enqueueSnackbar(`Failed to request reconcile: ${err.message || err}`, {
        variant: 'error',
      });
    }
  };
  return (
    <ActionButton
      description="Force Reconcile"
      icon="mdi:refresh"
      onClick={handleReconcile}
      buttonStyle={props.buttonStyle}
    />
  );
}

export function GlobalTenantResourceReconcileAction(props: any) {
  const { enqueueSnackbar } = useSnackbar();

  let resource = props.item || props.resource;
  if (!resource) return null;
  // tolerate being passed the call object { item, closeMenu } directly
  if (resource.item && !resource.jsonData && !resource.kind) resource = resource.item;

  const json = resource.jsonData || {};
  const kind =
    json.kind || resource.kind || (resource.constructor && (resource.constructor as any).kind);
  const apiVersion =
    json.apiVersion ||
    resource.apiVersion ||
    (resource.constructor && (resource.constructor as any).apiVersion);

  if (kind !== 'GlobalTenantResource' || !apiVersion?.startsWith('capsule.clastix.io/')) {
    return null;
  }
  const handleReconcile = async () => {
    try {
      const name = resource.getName
        ? resource.getName()
        : resource.jsonData?.metadata?.name || resource.metadata?.name;
      const patchUrl = `/apis/capsule.clastix.io/v1beta2/globaltenantresources/${name}`;
      const ts = new Date().toISOString();
      const patchBody = {
        metadata: {
          annotations: {
            'reconcile.projectcapsule.dev/requestedAt': ts,
          },
        },
      };
      await ApiProxy.patch(patchUrl, patchBody);
      enqueueSnackbar(`Reconcile requested for GlobalTenantResource ${name}`, {
        variant: 'success',
      });
      if (props.closeMenu) props.closeMenu();
    } catch (err: any) {
      enqueueSnackbar(`Failed to request reconcile: ${err.message || err}`, {
        variant: 'error',
      });
    }
  };
  return (
    <ActionButton
      description="Force Reconcile"
      icon="mdi:refresh"
      onClick={handleReconcile}
      buttonStyle={props.buttonStyle}
    />
  );
}

export function TenantCordonAction(props: any) {
  const [optimisticCordoned, setOptimisticCordoned] = useState<boolean | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  let resource = props.item || props.resource;
  // tolerate being passed the call object { item, closeMenu } directly
  if (resource?.item && !resource.jsonData && !resource.kind) {
    resource = resource.item;
  }

  if (!resource) return null;

  // Prefer jsonData (reliable for items coming from useList / ResourceListView),
  // then direct props, then class statics (for KubeObject subclass instances).
  const json = resource.jsonData || {};
  const kind =
    json.kind || resource.kind || (resource.constructor && (resource.constructor as any).kind);
  const apiVersion =
    json.apiVersion ||
    resource.apiVersion ||
    (resource.constructor && (resource.constructor as any).apiVersion);

  if (kind !== 'Tenant' || !apiVersion?.startsWith('capsule.clastix.io/')) {
    return null;
  }

  // Derive displayed state: prefer optimistic (for instant feedback on click),
  // otherwise the value from the (possibly mutated) resource.
  const isCordoned =
    optimisticCordoned !== null ? optimisticCordoned : !!resource.jsonData?.spec?.cordoned;

  const handleCordon = async () => {
    const current = !!resource.jsonData?.spec?.cordoned;
    const target = !current;

    // Optimistic update for this button instance + mutate the underlying
    // resource object so that re-opens of the kebab (and the list row
    // itself, including the State column) immediately see the new state
    // without waiting for the watch / throttle to deliver the update.
    setOptimisticCordoned(target);
    if (resource.jsonData) {
      if (!resource.jsonData.spec) resource.jsonData.spec = {};
      resource.jsonData.spec.cordoned = target;
      if (!resource.jsonData.status) resource.jsonData.status = {};
      resource.jsonData.status.state = target ? 'Cordoned' : 'Active';
    }

    try {
      const tName = resource.getName
        ? resource.getName()
        : resource.jsonData?.metadata?.name || resource.metadata?.name;
      const patchUrl = `/apis/capsule.clastix.io/v1beta2/tenants/${tName}`;
      const patchBody = target ? { spec: { cordoned: true } } : { spec: { cordoned: null } };
      await ApiProxy.patch(patchUrl, patchBody);
      enqueueSnackbar(`Tenant ${target ? 'cordoned' : 'uncordoned'} successfully`, {
        variant: 'success',
      });
      if (props.closeMenu) props.closeMenu();
    } catch (err: any) {
      // revert optimistic + mutation
      setOptimisticCordoned(null);
      if (resource.jsonData?.spec) {
        resource.jsonData.spec.cordoned = current;
      }
      if (resource.jsonData?.status) {
        resource.jsonData.status.state = current ? 'Cordoned' : 'Active';
      }
      enqueueSnackbar(`Failed: ${err.message || err}`, { variant: 'error' });
    }
  };

  return (
    <ActionButton
      description={isCordoned ? 'Uncordon Tenant' : 'Cordon Tenant'}
      icon={isCordoned ? 'mdi:play-circle' : 'mdi:pause-circle'}
      onClick={handleCordon}
      buttonStyle={props.buttonStyle}
    />
  );
}

export function NamespaceCordonAction(props: any) {
  const [optimisticCordoned, setOptimisticCordoned] = useState<boolean | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  let resource = props.item || props.resource;
  // tolerate being passed the call object { item, closeMenu } directly
  if (resource?.item && !resource.jsonData && !resource.kind) {
    resource = resource.item;
  }

  if (!resource) return null;

  const kind =
    resource.kind ||
    resource.jsonData?.kind ||
    (resource.constructor && (resource.constructor as any).kind);
  if (kind !== 'Namespace') {
    return null;
  }

  const labels = resource.jsonData?.metadata?.labels || {};
  const isCordoned =
    optimisticCordoned !== null
      ? optimisticCordoned
      : labels['projectcapsule.dev/cordoned'] === 'true';

  const handleCordon = async () => {
    const current = labels['projectcapsule.dev/cordoned'] === 'true';
    const target = !current;

    // Optimistic + mutate the object for instant kebab + list column feedback
    setOptimisticCordoned(target);
    if (resource.jsonData) {
      if (!resource.jsonData.metadata) resource.jsonData.metadata = {};
      if (!resource.jsonData.metadata.labels) resource.jsonData.metadata.labels = {};
      if (target) {
        resource.jsonData.metadata.labels['projectcapsule.dev/cordoned'] = 'true';
      } else {
        delete resource.jsonData.metadata.labels['projectcapsule.dev/cordoned'];
      }
    }

    try {
      const nsName = resource.getName
        ? resource.getName()
        : resource.jsonData?.metadata?.name || resource.metadata?.name;
      const patchUrl = `/api/v1/namespaces/${nsName}`;
      const patchBody = target
        ? { metadata: { labels: { 'projectcapsule.dev/cordoned': 'true' } } }
        : { metadata: { labels: { 'projectcapsule.dev/cordoned': null } } };
      await ApiProxy.patch(patchUrl, patchBody);
      enqueueSnackbar(`Namespace ${target ? 'cordoned' : 'uncordoned'} successfully`, {
        variant: 'success',
      });
      if (props.closeMenu) props.closeMenu();
    } catch (err: any) {
      setOptimisticCordoned(null);
      if (resource.jsonData?.metadata?.labels) {
        if (current) {
          resource.jsonData.metadata.labels['projectcapsule.dev/cordoned'] = 'true';
        } else {
          delete resource.jsonData.metadata.labels['projectcapsule.dev/cordoned'];
        }
      }
      enqueueSnackbar(`Failed: ${err.message || err}`, { variant: 'error' });
    }
  };

  return (
    <ActionButton
      description={isCordoned ? 'Uncordon Namespace' : 'Cordon Namespace'}
      icon={isCordoned ? 'mdi:play-circle' : 'mdi:pause-circle'}
      onClick={handleCordon}
      buttonStyle={props.buttonStyle}
    />
  );
}
