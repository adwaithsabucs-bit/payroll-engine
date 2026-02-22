// frontend/src/components/Layout.tsx — REPLACE ENTIRE FILE

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, ClipboardList,
  DollarSign, LogOut, HardHat, User as UserIcon,
} from 'lucide-react';
import logo from '../logo.svg';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['HR'] },
    { path: '/users',     label: 'Users',      icon: Users,           roles: ['HR'] },
    { path: '/workforce', label: 'Workforce',  icon: HardHat,         roles: ['HR', 'SUPERVISOR', 'CONTRACTOR'] },
    { path: '/attendance',label: 'Attendance', icon: ClipboardList,   roles: ['HR', 'SUPERVISOR', 'CONTRACTOR', 'LABOURER'] },
    { path: '/payroll',   label: 'Payroll',    icon: DollarSign,      roles: ['HR', 'SUPERVISOR', 'CONTRACTOR', 'LABOURER'] },
  ];

  const visibleItems = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@300;400;500;600&display=swap');

        .app-root {
          display: flex;
          min-height: 100vh;
          font-family: 'Barlow', sans-serif;
          background: #080808;
        }

        /* ── SIDEBAR ── */
        .sidebar {
          width: 220px;
          background: #0a0a0a;
          border-right: 1px solid #161616;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          position: relative;
        }

        /* Red top accent */
        .sidebar::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: #dc2626;
        }

        /* Subtle vertical texture */
        .sidebar::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 59px,
            rgba(255,255,255,0.012) 59px,
            rgba(255,255,255,0.012) 60px
          );
          pointer-events: none;
        }

        /* ── LOGO ── */
        .sidebar-logo {
          padding: 28px 20px 24px;
          border-bottom: 1px solid #161616;
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          z-index: 1;
        }

        .sidebar-logo img {
          width: 38px; height: 38px;
          object-fit: contain;
          border-radius: 50%;
          background: white;
          padding: 2px;
          flex-shrink: 0;
        }

        .sidebar-logo-text {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 17px; font-weight: 800;
          color: white; letter-spacing: 2px;
          text-transform: uppercase;
          line-height: 1;
        }

        .sidebar-logo-sub {
          font-size: 8px; color: #3f3f46;
          letter-spacing: 3px; text-transform: uppercase;
          margin-top: 3px;
        }

        /* ── NAV ── */
        .sidebar-nav {
          flex: 1;
          padding: 20px 12px;
          position: relative; z-index: 1;
        }

        .nav-section-label {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 9px; font-weight: 700;
          letter-spacing: 4px; text-transform: uppercase;
          color: #27272a; padding: 0 8px;
          margin-bottom: 10px; margin-top: 4px;
        }

        .nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px;
          margin-bottom: 2px;
          color: #52525b;
          text-decoration: none;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 15px; font-weight: 700;
          letter-spacing: 1.5px; text-transform: uppercase;
          position: relative;
          transition: all 0.15s ease;
          border-left: 2px solid transparent;
        }

        .nav-item:hover {
          color: #a1a1aa;
          background: rgba(255,255,255,0.03);
          border-left-color: #3f3f46;
        }

        .nav-item.active {
          color: white;
          background: rgba(220,38,38,0.08);
          border-left-color: #dc2626;
        }

        .nav-item.active svg { color: #dc2626; }

        /* Hover indicator number */
        .nav-item-num {
          margin-left: auto;
          font-size: 9px; color: #27272a;
          font-weight: 400; letter-spacing: 0;
          font-family: 'Barlow', sans-serif;
        }
        .nav-item.active .nav-item-num { color: #dc2626; }

        /* ── USER FOOTER ── */
        .sidebar-footer {
          border-top: 1px solid #161616;
          padding: 16px 12px;
          position: relative; z-index: 1;
        }

        .sidebar-user {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px;
          background: rgba(255,255,255,0.02);
          border: 1px solid #161616;
          margin-bottom: 8px;
        }

        .sidebar-avatar {
          width: 30px; height: 30px;
          background: #dc2626;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          clip-path: polygon(0 0, 80% 0, 100% 20%, 100% 100%, 20% 100%, 0 80%);
        }

        .sidebar-username {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 14px; font-weight: 700;
          color: white; letter-spacing: 1px;
          text-transform: uppercase;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          flex: 1;
        }

        .sidebar-role {
          font-size: 9px; color: #3f3f46;
          letter-spacing: 2px; text-transform: uppercase;
          font-family: 'Barlow', sans-serif;
        }

        .sidebar-logout {
          display: flex; align-items: center; gap: 8px;
          width: 100%; padding: 8px 12px;
          background: transparent; border: none;
          color: #3f3f46; cursor: pointer;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 12px; font-weight: 700;
          letter-spacing: 2px; text-transform: uppercase;
          transition: all 0.15s;
        }

        .sidebar-logout:hover {
          color: #dc2626;
        }

        /* ── MAIN CONTENT ── */
        .main-content {
          flex: 1;
          background: #080808;
          overflow: auto;
          position: relative;
        }

        /* Subtle dot pattern on main bg */
        .main-content::before {
          content: '';
          position: fixed;
          inset: 0; left: 220px;
          background-image: radial-gradient(circle, rgba(255,255,255,0.015) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
          z-index: 0;
        }

        .main-inner {
          position: relative;
          z-index: 1;
          max-width: 1280px;
          margin: 0 auto;
          padding: 40px 36px;
        }
      `}</style>

      <div className="app-root">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <img src={logo} alt="Logo" />
            <div>
              <div className="sidebar-logo-text">PayrollEngine</div>
              <div className="sidebar-logo-sub">Construction Wages</div>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-section-label">Navigation</div>
            {visibleItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onMouseEnter={() => setHoveredPath(item.path)}
                  onMouseLeave={() => setHoveredPath(null)}
                >
                  <Icon size={15} />
                  {item.label}
                  <span className="nav-item-num">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="sidebar-avatar">
                <UserIcon size={14} color="white" />
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div className="sidebar-username">
                  {user?.first_name || user?.username}
                </div>
                <div className="sidebar-role">{user?.role}</div>
              </div>
            </div>
            <button className="sidebar-logout" onClick={handleLogout}>
              <LogOut size={13} />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="main-content">
          <div className="main-inner">
            {children}
          </div>
        </main>
      </div>
    </>
  );
};

export default Layout;
