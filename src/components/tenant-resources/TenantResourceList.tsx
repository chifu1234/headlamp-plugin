import { Link, ResourceListView } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Chip } from '@mui/material';
import {
  getAppliedCount,
  getSpecResourcesCount,
  TenantResource,
} from '../../resources/tenantResources';
import { TenantResourceReconcileAction } from '../common/ReconcileActions';
import { TenantResourcesStats } from '../common/TenantResourcesStats';

export function TenantResourcesList() {
  const [items] = TenantResource.useList();

  return (
    <>
      <TenantResourcesStats items={items || []} scope="tenant" />
      <ResourceListView
        title="Tenant Resources"
        resourceClass={TenantResource}
        enableRowActions
        actions={[
          {
            id: 'force-reconcile',
            action: ({ item, closeMenu }: any) => (
              <TenantResourceReconcileAction item={item} closeMenu={closeMenu} buttonStyle="menu" />
            ),
          },
        ]}
        columns={[
          {
            id: 'name',
            label: 'Name',
            getValue: item => item.getName(),
            render: item => (
              <Link
                routeName="tenantresource"
                params={{
                  namespace: item.getNamespace(),
                  name: item.getName(),
                }}
              >
                {item.getName()}
              </Link>
            ),
          },
          'namespace',
          {
            id: 'resources',
            label: 'Resources',
            getValue: item => getSpecResourcesCount(item),
            render: item => {
              const count = getSpecResourcesCount(item);
              return <Chip size="small" label={`${count} resource${count === 1 ? '' : 's'}`} />;
            },
          },
          {
            id: 'statusResources',
            label: 'Replicated',
            getValue: item => getAppliedCount(item),
            render: item => {
              const count = getAppliedCount(item);
              return <Chip size="small" label={`${count} object${count === 1 ? '' : 's'}`} />;
            },
          },
          'age',
        ]}
      />
    </>
  );
}
