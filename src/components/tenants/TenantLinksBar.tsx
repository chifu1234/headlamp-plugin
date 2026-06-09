import { Icon } from '@iconify/react';
import { Avatar, Box, Divider, Paper, Popper, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Tenants } from '../../resources/tenants';
import { getTenantIcon, getTenantLinks, safeUrl } from '../../utils/tenantMeta';

function getSelectedTenantNames(): string[] {
  const saved =
    localStorage.getItem('selectedTenantNames') ||
    localStorage.getItem('selectedTenantName') ||
    localStorage.getItem('selectedTenant');
  let names: string[] = [];
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        names = parsed.filter((n: any) => typeof n === 'string');
      } else if (typeof parsed === 'string') {
        names = [parsed];
      } else if (parsed?.metadata && typeof parsed.metadata.name === 'string') {
        names = [parsed.metadata.name];
      }
    } catch (_e) {
      if (saved && !saved.startsWith('{') && !saved.startsWith('[')) {
        names = [saved.replace(/^"|"$/g, '')];
      }
    }
  }
  return names;
}

export function TenantLinksBar() {
  const [tenants] = Tenants.useList();
  const [selectedNames, setSelectedNames] = useState<string[]>(getSelectedTenantNames());

  // For the popup menu similar to TenantBox chooser
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [currentTenantName, setCurrentTenantName] = useState<string | null>(null);

  // Hover delay handling for stable UX
  const [closeTimer, setCloseTimer] = useState<number | null>(null);

  const clearCloseTimer = () => {
    if (closeTimer) {
      clearTimeout(closeTimer);
      setCloseTimer(null);
    }
  };

  const scheduleClose = () => {
    clearCloseTimer();
    const timer = window.setTimeout(() => {
      handleClose();
    }, 250); // slightly longer delay to make crossing from navbar to popup more reliable
    setCloseTimer(timer);
  };

  useEffect(() => {
    const update = () => setSelectedNames(getSelectedTenantNames());
    window.addEventListener('storage', update);
    window.addEventListener('tenantSelectionChanged', update as EventListener);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener('tenantSelectionChanged', update as EventListener);
    };
  }, []);

  const handleOpen = (event: React.MouseEvent<HTMLElement>, tenantName: string) => {
    clearCloseTimer();
    setAnchorEl(event.currentTarget);
    setCurrentTenantName(tenantName);
  };

  const handleClose = () => {
    clearCloseTimer();
    setAnchorEl(null);
    setCurrentTenantName(null);
  };

  const selectedTenantData = useMemo(() => {
    if (!tenants || selectedNames.length === 0) return [];

    const selectedSet = new Set(selectedNames);
    return tenants
      .filter((t: any) => {
        const n = t.getName ? t.getName() : t.metadata?.name;
        return selectedSet.has(n);
      })
      .map((t: any) => {
        const name = t.getName ? t.getName() : t.metadata?.name;
        const icon = getTenantIcon(t);
        const tenantLinks = getTenantLinks(t);
        return { name, icon, links: tenantLinks };
      });
  }, [tenants, selectedNames]);

  if (selectedTenantData.length === 0) {
    return null;
  }

  // Find current tenant for the popup
  const currentTenantData = selectedTenantData.find(t => t.name === currentTenantName);

  return (
    <>
      {/* Stable navbar - tenant names only, no size change on interaction */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 1.5,
          py: 0.25,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.default',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          minHeight: 32,
        }}
      >
        {selectedTenantData.map(tenantData => {
          const { name, icon } = tenantData;
          return (
            <Box
              key={name}
              onMouseEnter={e => handleOpen(e, name)}
              onMouseLeave={scheduleClose}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5,
                cursor: 'default',
                fontSize: '0.7rem',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              {icon && (
                <Avatar src={safeUrl(icon)} sx={{ width: 16, height: 16, fontSize: '0.55rem' }} />
              )}
              <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                {name}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Popup box similar to the tenant chooser - opens under the navbar.
          Using Popper + Paper directly (instead of Popover/Menu) to completely avoid
          focus management and aria-hidden issues that cause open/close loops on hover.
          Navbar popup. */}
      <Popper
        open={Boolean(anchorEl) && !!currentTenantData}
        anchorEl={anchorEl}
        placement="bottom-start"
        container={typeof document !== 'undefined' ? document.body : undefined}
        style={{ zIndex: 99999 }} // extremely high z-index to guarantee it appears in front of Headlamp's top app bar / navigation
        modifiers={[
          {
            name: 'offset',
            options: {
              offset: [0, 4],
            },
          },
        ]}
      >
        <Paper
          elevation={4}
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleClose}
          sx={{
            minWidth: 220,
            maxWidth: 320,
            py: 0.5,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            zIndex: 99999,
          }}
        >
          {currentTenantData && (
            <>
              {/* Header similar to chooser style */}
              <Box
                sx={{
                  px: 1.5,
                  py: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                {currentTenantData.icon && (
                  <Avatar src={safeUrl(currentTenantData.icon)} sx={{ width: 20, height: 20 }} />
                )}
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {currentTenantData.name}
                </Typography>
              </Box>
              <Divider sx={{ my: 0.5 }} />

              {currentTenantData.links.length > 0 ? (
                currentTenantData.links.map((link: any, i: number) => {
                  const href = safeUrl(link.url);
                  const iconSrc = safeUrl(link.icon);
                  return (
                    <Box
                      key={i}
                      component="a"
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleClose}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 1.5,
                        py: 0.75,
                        fontSize: '0.875rem',
                        color: 'text.primary',
                        textDecoration: 'none',
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                        cursor: 'pointer',
                      }}
                    >
                      {iconSrc ? (
                        <img
                          src={iconSrc}
                          style={{
                            width: 16,
                            height: 16,
                            objectFit: 'contain',
                          }}
                          alt=""
                        />
                      ) : link.icon ? (
                        Icon && typeof Icon === 'function' ? (
                          <Icon icon={link.icon} style={{ fontSize: 16 }} />
                        ) : null
                      ) : null}
                      <Typography variant="body2" noWrap>
                        {link.title || link.url}
                      </Typography>
                    </Box>
                  );
                })
              ) : (
                <Box
                  sx={{
                    px: 1.5,
                    py: 1,
                    color: 'text.secondary',
                    fontSize: '0.875rem',
                  }}
                >
                  No links configured
                </Box>
              )}
            </>
          )}
        </Paper>
      </Popper>
    </>
  );
}
