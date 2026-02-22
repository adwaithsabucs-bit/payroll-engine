// frontend/src/pages/DashboardPage.tsx — REPLACE ENTIRE FILE

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLabourers, getContractors } from '../api/workforce';
import { getAttendance } from '../api/attendance';
import { getPayrolls } from '../api/payroll';
import { extractResults } from '../utils/pagination';
import { Users, HardHat, ClipboardList, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    labourers: 0, contractors: 0, attendance: 0,
    pending_payroll: 0, approved_payroll: 0, total_wages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [labRes, conRes, attRes, payRes] = await Promise.all([
          getLabourers(),
          getContractors(),
          getAttendance(),
          getPayrolls({}),
        ]);
        const payrolls = extractResults<any>(payRes.data);
        const pending = payrolls.filter((p: any) => p.payment_status === 'PENDING').length;
        const approved = payrolls.filter((p: any) => p.payment_status === 'APPROVED').length;
        const totalWages = payrolls.reduce((s: number, p: any) => s + parseFloat(p.total_salary || 0), 0);

        setStats({
          labourers:       extractResults<any>(labRes.data).length,
          contractors:     extractResults<any>(conRes.data).length,
          attendance:      extractResults<any>(attRes.data).length,
          pending_payroll: pending,
          approved_payroll: approved,
          total_wages:     totalWages,
        });
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const cards = [
    { label: 'Labourers',       value: stats.labourers,       suffix: '',   icon: Users,        color: '#dc2626' },
    { label: 'Contractors',     value: stats.contractors,     suffix: '',   icon: HardHat,      color: '#2563eb' },
    { label: 'Attendance Logs', value: stats.attendance,      suffix: '',   icon: ClipboardList,color: '#d97706' },
    { label: 'Pending Payroll', value: stats.pending_payroll, suffix: '',   icon: AlertCircle,  color: '#dc2626' },
    { label: 'Approved Payroll',value: stats.approved_payroll,suffix: '',   icon: TrendingUp,   color: '#16a34a' },
    { label: 'Total Wages',     value: Math.round(stats.total_wages), suffix: '₹', icon: DollarSign, color: '#d97706' },
  ];

  return (
    <>
      <style>{`
        .dash-root { animation: pageIn 0.4s cubic-bezier(0.16,1,0.3,1); }
        @keyframes pageIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .dash-header {
          display: flex; align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 40px; padding-bottom: 28px;
          border-bottom: 1px solid #161616;
          position: relative;
        }
        .dash-header::after {
          content: ''; position: absolute;
          bottom: -1px; left: 0;
          width: 64px; height: 3px;
          background: #dc2626;
        }

        .dash-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 56px; font-weight: 900;
          color: white; text-transform: uppercase;
          letter-spacing: -2px; line-height: 1;
        }
        .dash-title em { font-style: normal; color: #dc2626; }

        .dash-greeting {
          font-size: 11px; letter-spacing: 4px;
          text-transform: uppercase; color: #3f3f46;
          margin-bottom: 8px; font-weight: 600;
        }

        .dash-clock {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 28px; font-weight: 700;
          color: white; letter-spacing: -1px; line-height: 1;
        }
        .dash-date {
          font-size: 11px; color: #3f3f46; letter-spacing: 2px;
          text-transform: uppercase; margin-top: 4px;
        }

        /* Stat grid */
        .dash-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
          margin-bottom: 40px;
        }

        .dash-stat {
          background: #0d0d0d;
          border: 1px solid #161616;
          padding: 28px 24px;
          position: relative; overflow: hidden;
          transition: all 0.2s;
          cursor: default;
        }

        .dash-stat::before {
          content: ''; position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: var(--stat-color, #dc2626);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s ease;
        }
        .dash-stat:hover::before { transform: scaleX(1); }

        .dash-stat:hover {
          background: #111;
          border-color: #222;
          transform: translateY(-2px);
        }

        /* Big ghost number */
        .dash-stat-ghost {
          position: absolute;
          right: -10px; bottom: -20px;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 100px; font-weight: 900;
          color: rgba(255,255,255,0.02);
          line-height: 1; pointer-events: none;
          user-select: none;
        }

        .dash-stat-icon {
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.04);
          border: 1px solid #1e1e1e;
          margin-bottom: 20px;
        }

        .dash-stat-label {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 10px; font-weight: 700;
          letter-spacing: 4px; text-transform: uppercase;
          color: #3f3f46; margin-bottom: 10px;
        }

        .dash-stat-value {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 56px; font-weight: 900;
          color: white; line-height: 1;
          letter-spacing: -2px;
        }

        .dash-stat-suffix {
          font-size: 22px; color: #3f3f46; margin-left: 4px;
        }

        /* Activity section */
        .dash-section-head {
          display: flex; align-items: center; gap: 14px;
          margin-bottom: 20px;
        }
        .dash-section-line { width: 32px; height: 2px; background: #dc2626; }
        .dash-section-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 13px; font-weight: 700;
          letter-spacing: 4px; text-transform: uppercase;
          color: #52525b;
        }

        .dash-info-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
        }

        .dash-info-card {
          background: #0d0d0d; border: 1px solid #161616;
          padding: 24px;
        }

        .dash-info-card-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 11px; font-weight: 700;
          letter-spacing: 4px; text-transform: uppercase;
          color: #3f3f46; margin-bottom: 16px;
        }

        .dash-info-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px 0; border-bottom: 1px solid #111;
          font-size: 13px; color: #71717a;
        }
        .dash-info-row:last-child { border-bottom: none; }
        .dash-info-row strong { color: white; font-weight: 600; }

        .dash-role-badge {
          display: inline-block;
          padding: 2px 10px;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 11px; font-weight: 700;
          letter-spacing: 2px; text-transform: uppercase;
          background: rgba(220,38,38,0.1);
          color: #f87171;
        }

        .dash-loading {
          display: flex; align-items: center; gap: 14px;
          padding: 80px 40px; color: #3f3f46;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 14px; letter-spacing: 3px; text-transform: uppercase;
        }
        .dash-loading-bar {
          width: 48px; height: 2px; background: #161616;
          position: relative; overflow: hidden;
        }
        .dash-loading-bar::after {
          content: ''; position: absolute; inset-block: 0;
          left: -100%; width: 100%; background: #dc2626;
          animation: loadBar 1s ease infinite;
        }
        @keyframes loadBar { to { left: 100%; } }
      `}</style>

      <div className="dash-root">
        {/* Header */}
        <div className="dash-header">
          <div>
            <div className="dash-greeting">Welcome back</div>
            <div className="dash-title">
              {user?.first_name || user?.username || 'Admin'}<em>.</em>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="dash-clock">
              {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="dash-date">
              {time.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="dash-loading">
            <div className="dash-loading-bar" />
            Loading data...
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="dash-grid">
              {cards.map((card, i) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className="dash-stat"
                    style={{ '--stat-color': card.color } as any}
                  >
                    <div className="dash-stat-ghost">{card.value}</div>
                    <div className="dash-stat-icon">
                      <Icon size={16} color={card.color} />
                    </div>
                    <div className="dash-stat-label">{card.label}</div>
                    <div className="dash-stat-value">
                      {card.suffix && <span style={{ fontSize: 20, color: '#3f3f46', marginRight: 4 }}>{card.suffix}</span>}
                      {card.value.toLocaleString('en-IN')}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Info section */}
            <div className="dash-section-head">
              <div className="dash-section-line" />
              <div className="dash-section-title">System Overview</div>
            </div>

            <div className="dash-info-grid">
              <div className="dash-info-card">
                <div className="dash-info-card-title">Current Session</div>
                <div className="dash-info-row">
                  <span>Logged in as</span>
                  <strong>{user?.username}</strong>
                </div>
                <div className="dash-info-row">
                  <span>Access level</span>
                  <span className="dash-role-badge">{user?.role}</span>
                </div>
                <div className="dash-info-row">
                  <span>Email</span>
                  <strong>{user?.email || '—'}</strong>
                </div>
              </div>

              <div className="dash-info-card">
                <div className="dash-info-card-title">Quick Status</div>
                <div className="dash-info-row">
                  <span>Workforce size</span>
                  <strong>{stats.labourers + stats.contractors} people</strong>
                </div>
                <div className="dash-info-row">
                  <span>Payroll awaiting</span>
                  <strong style={{ color: stats.pending_payroll > 0 ? '#f87171' : '#4ade80' }}>
                    {stats.pending_payroll} pending
                  </strong>
                </div>
                <div className="dash-info-row">
                  <span>Total disbursed</span>
                  <strong>₹{stats.total_wages.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default DashboardPage;
