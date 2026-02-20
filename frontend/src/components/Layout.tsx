import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, ClipboardList, DollarSign,
  LogOut, HardHat, User as UserIcon,
} from 'lucide-react';
import logo from '../logo.svg';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['HR'],
    },
    {
      path: '/users',
      label: 'Users',
      icon: Users,
      roles: ['HR'],
    },
    {
      path: '/workforce',
      label: 'Workforce',
      icon: HardHat,
      roles: ['HR', 'SUPERVISOR', 'CONTRACTOR'],
    },
    {
      path: '/attendance',
      label: 'Attendance',
      icon: ClipboardList,
      roles: ['HR', 'SUPERVISOR', 'CONTRACTOR', 'LABOURER'],
    },
    {
      path: '/payroll',
      label: 'Payroll',
      icon: DollarSign,
      roles: ['HR', 'SUPERVISOR', 'CONTRACTOR', 'LABOURER'],
    },
  ];

  const visibleItems = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Sidebar */}
      <aside style={{
        width: 240,
        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>

        {/* Logo */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src={logo}
              alt="Logo"
              style={{
                width: 42,
                height: 42,
                objectFit: 'contain',
                borderRadius: '50%',
                background: 'white',
                padding: 2,
              }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>PayrollEngine</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Construction Wages</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          {visibleItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 8,
                  marginBottom: 4,
                  color: isActive ? 'white' : '#94a3b8',
                  background: isActive ? 'rgba(245,158,11,0.15)' : 'transparent',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.15s',
                  borderLeft: isActive ? '3px solid #f59e0b' : '3px solid transparent',
                }}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info & logout */}
        <div style={{ padding: '16px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 8,
            marginBottom: 8,
          }}>
            <div style={{
              width: 32, height: 32,
              background: '#f59e0b',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <UserIcon size={16} color="white" />
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: 'white',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {user?.first_name || user?.username}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{user?.role}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>

      </aside>

      {/* Main content */}
      <main style={{ flex: 1, background: '#f8fafc', overflow: 'auto' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
          {children}
        </div>
      </main>

    </div>
  );
};

export default Layout;