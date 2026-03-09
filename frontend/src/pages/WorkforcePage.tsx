// frontend/src/pages/WorkforcePage.tsx — REPLACE ENTIRE FILE

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLabourers, getContractors } from '../api/workforce';
import { extractResults } from '../utils/pagination';
import { HardHat, Users, TrendingUp, DollarSign } from 'lucide-react';

const S = {
  page:       { animation: 'pageIn 0.4s cubic-bezier(0.16,1,0.3,1)' } as React.CSSProperties,
  hdr:        { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #161616', position: 'relative' } as React.CSSProperties,
  hdrLine:    { position: 'absolute', bottom: -1, left: 0, width: 64, height: 3, background: '#dc2626' } as React.CSSProperties,
  title:      { fontFamily: "'Barlow Condensed',sans-serif", fontSize: 48, fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: -1, lineHeight: 1 } as React.CSSProperties,
  sub:        { fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', color: '#3f3f46', marginBottom: 8, fontWeight: 600 } as React.CSSProperties,
  statsRow:   { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 2, marginBottom: 24 } as React.CSSProperties,
  statBox:    { background: '#0d0d0d', border: '1px solid #161616', padding: '22px 24px', position: 'relative', overflow: 'hidden', transition: 'all 0.2s' } as React.CSSProperties,
  statLabel:  { fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color: '#3f3f46', marginBottom: 10 } as React.CSSProperties,
  statVal:    { fontFamily: "'Barlow Condensed',sans-serif", fontSize: 44, fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: -2 } as React.CSSProperties,
  statBar:    { position: 'absolute', top: 0, left: 0, right: 0, height: 2 } as React.CSSProperties,
  grid2:      { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 } as React.CSSProperties,
  panel:      { background: '#0d0d0d', border: '1px solid #161616', padding: 24 } as React.CSSProperties,
  panelHead:  { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 } as React.CSSProperties,
  panelLine:  { width: 28, height: 2, background: '#dc2626' } as React.CSSProperties,
  panelTitle: { fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color: '#52525b' } as React.CSSProperties,
  tableWrap:  { background: '#0d0d0d', border: '1px solid #161616', overflow: 'hidden', marginBottom: 24 } as React.CSSProperties,
  th:         { padding: '12px 18px', textAlign: 'left' as const, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, color: '#3f3f46', textTransform: 'uppercase' as const, letterSpacing: 3 },
  td:         { padding: '13px 18px', fontSize: 13, color: '#a1a1aa', borderBottom: '1px solid #111' },
  tab:        { display: 'flex', gap: 2, marginBottom: 20 } as React.CSSProperties,
};

export default function WorkforcePage() {
  const { user } = useAuth();
  const [labourers, setLabourers]   = useState<any[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [activeTab, setActiveTab]   = useState<'labourers' | 'contractors'>('labourers');
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const labRes = await getLabourers();
        setLabourers(extractResults<any>(labRes.data));
        if (user?.role !== 'CONTRACTOR') {
          const conRes = await getContractors();
          setContractors(extractResults<any>(conRes.data));
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, [user?.role]);

  // Skill breakdown
  const skillMap: Record<string, number> = {};
  labourers.forEach(l => { const sk = l.skill || 'Unassigned'; skillMap[sk] = (skillMap[sk] || 0) + 1; });
  const skills   = Object.entries(skillMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxSkill = Math.max(...skills.map(s => s[1]), 1);

  // Wage stats
  const wages       = labourers.map(l => parseFloat(l.daily_wage || 0));
  const avgWage     = wages.length ? wages.reduce((a, b) => a + b, 0) / wages.length : 0;
  const totalPayroll = wages.reduce((a, b) => a + b, 0);

  // Contractor labourer count bars
  // FIX: use contractor id directly (l.contractor is a PK integer from LabourerSerializer)
  const conBars = contractors.map(c => ({
    name:  c.user_detail?.first_name || c.user_detail?.username || 'Contractor',
    count: labourers.filter(l => l.contractor === c.id).length,
  })).sort((a, b) => b.count - a.count).slice(0, 5);
  const maxCon = Math.max(...conBars.map(c => c.count), 1);

  const tabBtn = (key: 'labourers' | 'contractors', label: string) => ({
    background:      activeTab === key ? '#dc2626' : '#0d0d0d',
    color:           activeTab === key ? 'white' : '#52525b',
    border:          `1px solid ${activeTab === key ? '#dc2626' : '#1a1a1a'}`,
    padding:         '9px 20px',
    fontFamily:      "'Barlow Condensed',sans-serif",
    fontSize:        12, fontWeight: 700, letterSpacing: 3,
    textTransform:   'uppercase' as const, cursor: 'pointer',
    transition:      'all 0.15s',
  });

  return (
    <>
      <style>{`
        @keyframes pageIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .wf-stat:hover{background:#111!important;transform:translateY(-2px);}
        .wf-row:hover td{background:#111;}
      `}</style>

      <div style={S.page}>
        {/* Header */}
        <div style={S.hdr}>
          <div style={S.hdrLine} />
          <div>
            <div style={S.sub}>Management</div>
            <div style={S.title}>Workforce</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#3f3f46', marginBottom: 4 }}>Total Strength</div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 36, fontWeight: 900, color: 'white', lineHeight: 1 }}>
              {labourers.length + contractors.length}<span style={{ color: '#dc2626' }}>+</span>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div style={S.statsRow}>
          {[
            { label: 'Total Labourers', val: labourers.length,              color: '#dc2626', icon: Users      },
            { label: 'Contractors',     val: contractors.length,            color: '#2563eb', icon: HardHat    },
            { label: 'Avg Daily Wage',  val: `₹${Math.round(avgWage)}`,    color: '#facc15', icon: DollarSign },
            { label: 'Daily Payroll',   val: `₹${Math.round(totalPayroll)}`,color: '#4ade80', icon: TrendingUp },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="wf-stat" style={S.statBox}>
                <div style={{ ...S.statBar, background: s.color }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={S.statLabel}>{s.label}</div>
                    <div style={{ ...S.statVal, color: s.color, fontSize: typeof s.val === 'string' ? 28 : 44 }}>{s.val}</div>
                  </div>
                  <Icon size={20} color={s.color} style={{ opacity: 0.4, marginTop: 4 }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts row */}
        <div style={S.grid2}>
          {/* Skills */}
          <div style={S.panel}>
            <div style={S.panelHead}>
              <div style={S.panelLine} />
              <div style={S.panelTitle}>Skills Breakdown</div>
            </div>
            {skills.length === 0 ? (
              <div style={{ color: '#27272a', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, letterSpacing: 3, textTransform: 'uppercase' }}>No data yet</div>
            ) : skills.map(([skill, count]) => (
              <div key={skill} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#71717a' }}>{skill}</span>
                  <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 900, color: 'white' }}>{count}</span>
                </div>
                <div style={{ height: 4, background: '#1a1a1a', borderRadius: 0, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#dc2626', width: `${(count / maxSkill) * 100}%`, transition: 'width 0.5s' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Contractor labourer count */}
          <div style={S.panel}>
            <div style={S.panelHead}>
              <div style={S.panelLine} />
              <div style={S.panelTitle}>Labourers per Contractor</div>
            </div>
            {conBars.length === 0 ? (
              <div style={{ color: '#27272a', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, letterSpacing: 3, textTransform: 'uppercase' }}>No contractors yet</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 110 }}>
                {conBars.map(c => (
                  <div key={c.name} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 900, color: 'white' }}>{c.count}</span>
                    <div style={{ width: '100%', background: '#2563eb', height: maxCon ? `${(c.count / maxCon) * 80}px` : '4px', minHeight: 4, transition: 'height 0.5s' }} />
                    <div style={{ fontSize: 9, color: '#3f3f46', letterSpacing: 1, textAlign: 'center', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={S.tab}>
          <button style={tabBtn('labourers', 'Labourers')} onClick={() => setActiveTab('labourers')}>
            Labourers ({labourers.length})
          </button>
          {user?.role !== 'CONTRACTOR' && (
            <button style={tabBtn('contractors', 'Contractors')} onClick={() => setActiveTab('contractors')}>
              Contractors ({contractors.length})
            </button>
          )}
        </div>

        {/* Labourers table */}
        {activeTab === 'labourers' && (
          <div style={S.tableWrap}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}>
                  {['Name', 'Skill', 'Daily Wage', 'Overtime Rate', 'Contractor', 'Status'].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#3f3f46', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 4, textTransform: 'uppercase', fontSize: 12 }}>Loading...</td></tr>
                ) : labourers.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 60, textAlign: 'center', color: '#27272a', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 4, textTransform: 'uppercase', fontSize: 14 }}>No Labourers Found</td></tr>
                ) : labourers.map(l => (
                  <tr key={l.id} className="wf-row">
                    <td style={{ ...S.td, color: 'white', fontWeight: 600 }}>
                      {l.user_detail?.first_name} {l.user_detail?.last_name || l.user_detail?.username}
                    </td>
                    <td style={S.td}>
                      <span style={{ background: 'rgba(37,99,235,0.1)', color: '#60a5fa', padding: '3px 10px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
                        {l.skill || 'Unassigned'}
                      </span>
                    </td>
                    <td style={{ ...S.td, color: '#facc15', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 15 }}>₹{l.daily_wage}</td>
                    <td style={S.td}>₹{l.overtime_rate}/hr</td>
                    {/* FIX: use contractor_name (SerializerMethodField), not contractor_detail which doesn't exist */}
                    <td style={S.td}>{l.contractor_name || '—'}</td>
                    <td style={S.td}>
                      <span style={{ background: l.is_active ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)', color: l.is_active ? '#4ade80' : '#f87171', padding: '3px 10px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
                        {l.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Contractors table */}
        {activeTab === 'contractors' && (
          <div style={S.tableWrap}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}>
                  {['Name', 'Company', 'Supervisor', 'Labourers', 'Status'].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#3f3f46', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 4, textTransform: 'uppercase', fontSize: 12 }}>Loading...</td></tr>
                ) : contractors.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 60, textAlign: 'center', color: '#27272a', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 4, textTransform: 'uppercase', fontSize: 14 }}>No Contractors Found</td></tr>
                ) : contractors.map(c => (
                  <tr key={c.id} className="wf-row">
                    <td style={{ ...S.td, color: 'white', fontWeight: 600 }}>
                      {c.user_detail?.first_name} {c.user_detail?.last_name || c.user_detail?.username}
                    </td>
                    <td style={S.td}>{c.company_name || '—'}</td>
                    {/* FIX: use supervisor_name (SerializerMethodField), not supervisor_detail which doesn't exist */}
                    <td style={S.td}>{c.supervisor_name || '—'}</td>
                    <td style={{ ...S.td, color: '#60a5fa', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 18 }}>
                      {labourers.filter(l => l.contractor === c.id).length}
                    </td>
                    <td style={S.td}>
                      <span style={{ background: c.is_active ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)', color: c.is_active ? '#4ade80' : '#f87171', padding: '3px 10px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
