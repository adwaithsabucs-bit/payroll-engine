// frontend/src/components/Layout.tsx — REPLACE ENTIRE FILE

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, ClipboardList, DollarSign,
  LogOut, HardHat, User, ChevronRight, Menu
} from 'lucide-react';

const SIDEBAR_WIDTH = 260;
const TRIGGER_ZONE = 24; // px from left edge to trigger sidebar

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [hoveringTrigger, setHoveringTrigger] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['HR'] },
    { path: '/users',     label: 'Users',     icon: Users,           roles: ['HR'] },
    { path: '/workforce', label: 'Workforce',  icon: Users,           roles: ['HR', 'SUPERVISOR', 'CONTRACTOR'] },
    { path: '/attendance',label: 'Attendance', icon: ClipboardList,   roles: ['HR', 'SUPERVISOR', 'CONTRACTOR', 'LABOURER'] },
    { path: '/payroll',   label: 'Payroll',    icon: DollarSign,      roles: ['HR', 'SUPERVISOR', 'CONTRACTOR', 'LABOURER'] },
  ];

  const visibleItems = navItems.filter(item => user && item.roles.includes(user.role));

  const showSidebar = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setSidebarOpen(true);
  }, []);

  const schedulehide = useCallback(() => {
    if (pinned) return;
    hideTimerRef.current = setTimeout(() => {
      setSidebarOpen(false);
    }, 300);
  }, [pinned]);

  // Mouse position tracking for trigger zone
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientX <= TRIGGER_ZONE) {
        setHoveringTrigger(true);
        showSidebar();
      } else {
        setHoveringTrigger(false);
        // If mouse moves far from sidebar, hide it
        if (e.clientX > SIDEBAR_WIDTH + 40 && !pinned) {
          if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
          hideTimerRef.current = setTimeout(() => setSidebarOpen(false), 400);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [pinned, showSidebar]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleColor: Record<string, string> = {
    HR: '#a78bfa',
    SUPERVISOR: '#60a5fa',
    CONTRACTOR: '#facc15',
    LABOURER: '#4ade80',
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#09090b',
      fontFamily: "'Inter', system-ui, sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* ── Trigger zone indicator (subtle glow on left edge) ── */}
      <div style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: 3,
        height: '100vh',
        background: hoveringTrigger || sidebarOpen
          ? 'linear-gradient(180deg, transparent, #dc2626, transparent)'
          : 'linear-gradient(180deg, transparent, rgba(220,38,38,0.2), transparent)',
        zIndex: 200,
        transition: 'all 0.3s ease',
        pointerEvents: 'none',
      }} />

      {/* ── Backdrop (click to close if not pinned) ── */}
      {sidebarOpen && !pinned && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 98,
            animation: 'fadeIn 0.2s ease',
          }}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        ref={sidebarRef}
        onMouseEnter={showSidebar}
        onMouseLeave={schedulehide}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100vh',
          width: SIDEBAR_WIDTH,
          background: 'linear-gradient(180deg, #0d0d0d 0%, #0a0a0a 100%)',
          borderRight: '1px solid #1a1a1a',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 99,
          transform: sidebarOpen ? 'translateX(0)' : `translateX(-${SIDEBAR_WIDTH}px)`,
          transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: sidebarOpen ? '8px 0 40px rgba(0,0,0,0.6)' : 'none',
        }}
      >
        {/* Logo */}
        <div style={{
          padding: '24px 20px 20px',
          borderBottom: '1px solid #161616',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              background: 'linear-gradient(135deg, #dc2626, #991b1b)',
              borderRadius: 10,
              padding: 9,
              display: 'flex',
              boxShadow: '0 4px 12px rgba(220,38,38,0.3)',
            }}>
              <HardHat size={18} color="white" />
            </div>
            <div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800,
                fontSize: 17,
                color: 'white',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
              }}>
                PAYROLLENGINE
              </div>
              <div style={{ fontSize: 10, color: '#3f3f46', letterSpacing: 2, textTransform: 'uppercase' }}>
                Construction Wages
              </div>
            </div>
          </div>

          {/* Pin button */}
          <button
            onClick={() => setPinned(!pinned)}
            title={pinned ? 'Unpin sidebar' : 'Pin sidebar'}
            style={{
              background: pinned ? 'rgba(220,38,38,0.1)' : 'transparent',
              border: `1px solid ${pinned ? '#dc2626' : '#1e1e1e'}`,
              borderRadius: 6,
              padding: 5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            <Menu size={14} color={pinned ? '#dc2626' : '#3f3f46'} />
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          <div style={{
            fontSize: 9,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: '#27272a',
            fontWeight: 700,
            padding: '0 8px',
            marginBottom: 10,
          }}>
            Navigation
          </div>

          {visibleItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => { if (!pinned) setSidebarOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 14px',
                  borderRadius: 8,
                  marginBottom: 3,
                  color: isActive ? 'white' : '#52525b',
                  background: isActive
                    ? 'linear-gradient(90deg, rgba(220,38,38,0.15), rgba(220,38,38,0.05))'
                    : 'transparent',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.2s ease',
                  borderLeft: `2px solid ${isActive ? '#dc2626' : 'transparent'}`,
                  position: 'relative',
                  animation: `slideIn 0.3s ease ${idx * 0.05}s both`,
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.color = '#a1a1aa';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.color = '#52525b';
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }
                }}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {isActive && (
                  <ChevronRight size={12} style={{ marginLeft: 'auto', color: '#dc2626' }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div style={{ padding: '12px', borderTop: '1px solid #161616' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px',
            background: '#111',
            borderRadius: 8,
            marginBottom: 8,
            border: '1px solid #1a1a1a',
          }}>
            <div style={{
              width: 34,
              height: 34,
              background: 'linear-gradient(135deg, #dc2626, #991b1b)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(220,38,38,0.3)',
            }}>
              <User size={15} color="white" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'white',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {user?.first_name || user?.username}
              </div>
              <div style={{
                fontSize: 10,
                color: roleColor[user?.role || ''] || '#52525b',
                letterSpacing: 1,
                textTransform: 'uppercase',
                fontWeight: 600,
              }}>
                {user?.role}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 12px',
              background: 'transparent',
              border: '1px solid #1a1a1a',
              borderRadius: 8,
              color: '#52525b',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              transition: 'all 0.2s',
              letterSpacing: 0.5,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,0.07)';
              (e.currentTarget as HTMLElement).style.color = '#fca5a5';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(220,38,38,0.3)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = '#52525b';
              (e.currentTarget as HTMLElement).style.borderColor = '#1a1a1a';
            }}
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{
        flex: 1,
        marginLeft: pinned ? SIDEBAR_WIDTH : 0,
        transition: 'margin-left 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        minHeight: '100vh',
        background: '#09090b',
        overflow: 'auto',
      }}>
        {/* Top bar */}
        <div style={{
          height: 56,
          borderBottom: '1px solid #111',
          display: 'flex',
          alignItems: 'center',
          padding: '0 28px',
          background: 'rgba(9,9,11,0.8)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          gap: 16,
        }}>
          {/* Hamburger toggle */}
          <button
            onClick={() => { setSidebarOpen(!sidebarOpen); if (!sidebarOpen) setPinned(false); }}
            style={{
              background: 'transparent',
              border: '1px solid #1e1e1e',
              borderRadius: 7,
              padding: '7px 9px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: '#52525b',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = 'white';
              (e.currentTarget as HTMLElement).style.borderColor = '#dc2626';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = '#52525b';
              (e.currentTarget as HTMLElement).style.borderColor = '#1e1e1e';
            }}
          >
            <Menu size={16} />
          </button>

          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 20,
              height: 2,
              background: '#dc2626',
              borderRadius: 1,
            }} />
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: '#3f3f46',
            }}>
              {visibleItems.find(i => location.pathname.startsWith(i.path))?.label || 'PayrollEngine'}
            </span>
          </div>

          {/* Right side — user pill */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 12px 5px 6px',
              background: '#111',
              border: '1px solid #1a1a1a',
              borderRadius: 20,
            }}>
              <div style={{
                width: 24,
                height: 24,
                background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <User size={12} color="white" />
              </div>
              <span style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 500 }}>
                {user?.username}
              </span>
              <span style={{
                fontSize: 9,
                color: roleColor[user?.role || ''] || '#52525b',
                background: `${roleColor[user?.role || ''] || '#52525b'}15`,
                padding: '2px 7px',
                borderRadius: 10,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}>
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div style={{
          padding: '36px 32px',
          maxWidth: 1280,
          margin: '0 auto',
          animation: 'contentIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {children}
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideIn { from { opacity:0; transform:translateX(-12px) } to { opacity:1; transform:translateX(0) } }
        @keyframes contentIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0d0d0d; }
        ::-webkit-scrollbar-thumb { background: #1e1e1e; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #dc2626; }
      `}</style>
    </div>
  );
};

export default Layout;
