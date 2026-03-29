// frontend/src/pages/HierarchyPage.tsx — NEW FILE

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { extractResults } from '../utils/pagination';
import {
  ChevronDown, ChevronRight, Shield, Users, Briefcase,
  HardHat, Search, AlertCircle, TreePine,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────
interface UserNode {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  phone?: string;
  company_name?: string;
}

interface LabourerNode extends UserNode {
  labourer_id: number;
  daily_wage: string;
  overtime_rate: string;
  skill: string;
  is_active: boolean;
}

interface ContractorNode extends UserNode {
  contractor_id: number;
  company_name: string;
  is_active: boolean;
  labourers: LabourerNode[];
}

interface SupervisorNode extends UserNode {
  contractors: ContractorNode[];
  unassignedContractors?: ContractorNode[]; // contractors not linked by project
}

interface HierarchyData {
  supervisors: SupervisorNode[];
  unassignedContractors: ContractorNode[];  // no supervisor
  unassignedLabourers: LabourerNode[];      // no contractor
  hrUsers: UserNode[];
}

// ── Role styling ─────────────────────────────────────────────────
const ROLE = {
  HR:         { color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)', Icon: Shield    },
  SUPERVISOR: { color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.2)',  Icon: Users     },
  CONTRACTOR: { color: '#facc15', bg: 'rgba(250,204,21,0.08)',  border: 'rgba(250,204,21,0.2)',  Icon: Briefcase },
  LABOURER:   { color: '#4ade80', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.2)',  Icon: HardHat   },
};

const fullName = (u: any) =>
  [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.username;

// ── Labourer leaf ────────────────────────────────────────────────
const LabourerCard = ({
  lab, depth, search,
}: { lab: LabourerNode; depth: number; search: string }) => {
  const { color, bg, border, Icon } = ROLE.LABOURER;
  const name = fullName(lab);
  if (search && !name.toLowerCase().includes(search) && !lab.username.toLowerCase().includes(search) && !(lab.skill || '').toLowerCase().includes(search)) return null;

  return (
    <div style={{
      marginLeft: depth * 28,
      marginBottom: 6,
      background: bg,
      border: `1px solid ${border}`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 6,
      padding: '10px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        background: `${color}15`, border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={14} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, color: 'white', fontSize: 13 }}>{name}</span>
          <span style={{ fontSize: 12, color: '#a1a1aa', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>@{lab.username}</span>
          {lab.skill && (
            <span style={{ fontSize: 13, color, background: `${color}12`, padding: '2px 7px', borderRadius: 8, fontWeight: 700, letterSpacing: 1 }}>
              {lab.skill}
            </span>
          )}
          {!lab.is_active && (
            <span style={{ fontSize: 13, color: '#f87171', background: 'rgba(248,113,113,0.1)', padding: '2px 7px', borderRadius: 8, fontWeight: 700 }}>INACTIVE</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#71717a' }}>{lab.email}</span>
          {lab.phone && <span style={{ fontSize: 13, color: '#a1a1aa' }}>{lab.phone}</span>}
          <span style={{ fontSize: 13, color: color, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>₹{lab.daily_wage}/day</span>
          {parseFloat(lab.overtime_rate) > 0 && (
            <span style={{ fontSize: 13, color: '#71717a' }}>OT ₹{lab.overtime_rate}/hr</span>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Contractor branch ────────────────────────────────────────────
const ContractorBranch = ({
  con, depth, search, defaultOpen,
}: { con: ContractorNode; depth: number; search: string; defaultOpen: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  const { color, bg, border, Icon } = ROLE.CONTRACTOR;
  const name = fullName(con);

  const matchesSelf = !search || name.toLowerCase().includes(search)
    || con.username.toLowerCase().includes(search)
    || (con.company_name || '').toLowerCase().includes(search);

  const visibleLabs = con.labourers.filter(l => {
    if (!search) return true;
    const n = fullName(l);
    return n.toLowerCase().includes(search) || l.username.toLowerCase().includes(search) || (l.skill || '').toLowerCase().includes(search) || matchesSelf;
  });

  if (!matchesSelf && visibleLabs.length === 0) return null;

  return (
    <div style={{ marginLeft: depth * 28, marginBottom: 8 }}>
      {/* Connector line */}
      <div style={{ position: 'relative' }}>
        {depth > 0 && (
          <div style={{
            position: 'absolute', left: -20, top: 20,
            width: 16, height: 1, background: '#2a2a2a',
          }} />
        )}
        <div
          onClick={() => setOpen(!open)}
          style={{
            background: bg, border: `1px solid ${border}`,
            borderLeft: `3px solid ${color}`, borderRadius: 6,
            padding: '12px 14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 12,
            transition: 'background 0.15s',
          }}
        >
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: `${color}15`, border: `1px solid ${color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon size={16} color={color} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>{name}</span>
              <span style={{ fontSize: 12, color: '#a1a1aa', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>@{con.username}</span>
              {con.company_name && (
                <span style={{ fontSize: 13, color: '#a1a1aa' }}>{con.company_name}</span>
              )}
              {!con.is_active && (
                <span style={{ fontSize: 13, color: '#f87171', background: 'rgba(248,113,113,0.1)', padding: '2px 7px', borderRadius: 8, fontWeight: 700 }}>INACTIVE</span>
              )}
            </div>
            <div style={{ fontSize: 13, color: '#71717a', marginTop: 2 }}>{con.email}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: `${color}12`, padding: '4px 10px', borderRadius: 10,
            }}>
              <HardHat size={11} color={color} />
              <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "'Barlow Condensed', sans-serif" }}>
                {con.labourers.length}
              </span>
            </div>
            {open
              ? <ChevronDown size={15} color={color} />
              : <ChevronRight size={15} color={color} />}
          </div>
        </div>
      </div>

      {/* Children */}
      {open && (
        <div style={{ marginTop: 6, paddingLeft: 12, borderLeft: `1px dashed ${color}25` }}>
          {visibleLabs.length === 0 ? (
            <div style={{ padding: '8px 14px', fontSize: 12, color: '#71717a', fontStyle: 'italic' }}>
              No labourers assigned yet
            </div>
          ) : (
            visibleLabs.map(l => (
              <LabourerCard key={l.id} lab={l} depth={0} search={search} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ── Supervisor branch ────────────────────────────────────────────
const SupervisorBranch = ({
  sv, depth, search, defaultOpen,
}: { sv: SupervisorNode; depth: number; search: string; defaultOpen: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  const { color, bg, border, Icon } = ROLE.SUPERVISOR;
  const name = fullName(sv);

  const matchesSelf = !search || name.toLowerCase().includes(search)
    || sv.username.toLowerCase().includes(search);

  const visibleContractors = sv.contractors.filter(c => {
    if (!search || matchesSelf) return true;
    const cn = fullName(c);
    if (cn.toLowerCase().includes(search) || c.username.toLowerCase().includes(search)) return true;
    return c.labourers.some(l => {
      const ln = fullName(l);
      return ln.toLowerCase().includes(search) || l.username.toLowerCase().includes(search) || (l.skill || '').toLowerCase().includes(search);
    });
  });

  if (!matchesSelf && visibleContractors.length === 0) return null;

  const totalLabourers = sv.contractors.reduce((n, c) => n + c.labourers.length, 0);

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          background: bg, border: `1px solid ${border}`,
          borderLeft: `3px solid ${color}`, borderRadius: 8,
          padding: '14px 16px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12,
          transition: 'background 0.15s',
        }}
      >
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          background: `${color}18`, border: `1px solid ${color}35`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={18} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: 'white', fontSize: 15 }}>{name}</span>
            <span style={{ fontSize: 12, color: '#a1a1aa', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>@{sv.username}</span>
          </div>
          <div style={{ fontSize: 13, color: '#71717a', marginTop: 2 }}>{sv.email}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: `${color}12`, padding: '4px 10px', borderRadius: 10 }}>
            <Briefcase size={11} color={color} />
            <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "'Barlow Condensed', sans-serif" }}>
              {sv.contractors.length} contractors
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(74,222,128,0.1)', padding: '4px 10px', borderRadius: 10 }}>
            <HardHat size={11} color="#4ade80" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#4ade80', fontFamily: "'Barlow Condensed', sans-serif" }}>
              {totalLabourers} labourers
            </span>
          </div>
          {open
            ? <ChevronDown size={15} color={color} />
            : <ChevronRight size={15} color={color} />}
        </div>
      </div>

      {open && (
        <div style={{ marginTop: 8, paddingLeft: 16, borderLeft: `1px dashed ${color}30` }}>
          {visibleContractors.length === 0 ? (
            <div style={{ padding: '10px 14px', fontSize: 12, color: '#71717a', fontStyle: 'italic' }}>
              No contractors assigned yet
            </div>
          ) : (
            visibleContractors.map(c => (
              <ContractorBranch
                key={c.id} con={c} depth={0}
                search={search} defaultOpen={!!search || defaultOpen}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ── Unassigned section ───────────────────────────────────────────
const UnassignedSection = ({
  title, color, icon: Icon, count, children,
}: { title: string; color: string; icon: any; count: number; children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', cursor: 'pointer',
          background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)',
          borderLeft: '3px solid #ef4444', borderRadius: open ? '8px 8px 0 0' : 8,
        }}
      >
        <AlertCircle size={14} color="#ef4444" />
        <Icon size={14} color={color} />
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: '#ef4444' }}>
          {title}
        </span>
        <span style={{ fontSize: 13, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
          {count}
        </span>
        <span style={{ fontSize: 13, color: '#a1a1aa', marginLeft: 4 }}>not yet assigned</span>
        <div style={{ marginLeft: 'auto' }}>
          {open ? <ChevronDown size={13} color="#71717a" /> : <ChevronRight size={13} color="#71717a" />}
        </div>
      </div>
      {open && (
        <div style={{ border: '1px solid rgba(239,68,68,0.1)', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: 12 }}>
          {children}
        </div>
      )}
    </div>
  );
};

// ── Main page ────────────────────────────────────────────────────
export default function HierarchyPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hierarchy, setHierarchy] = useState<HierarchyData | null>(null);
  const [search, setSearch] = useState('');
  const [expandAll, setExpandAll] = useState(false);
  const [key, setKey] = useState(0); // force re-render on expand toggle

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, contractorsRes, labourersRes] = await Promise.all([
        apiClient.get('/auth/users/'),
        apiClient.get('/workforce/contractors/'),
        apiClient.get('/workforce/labourers/'),
      ]);

      const allUsers      = extractResults<any>(usersRes.data);
      const allContractors = extractResults<any>(contractorsRes.data);
      const allLabourers  = extractResults<any>(labourersRes.data);

      // Build labourer nodes keyed by contractor_id
      const labsByContractor: Record<number, LabourerNode[]> = {};
      const unassignedLabourers: LabourerNode[] = [];

      allLabourers.forEach((l: any) => {
        const u = l.user_detail || {};
        const node: LabourerNode = {
          id: u.id || l.user,
          labourer_id: l.id,
          username:     u.username || '',
          first_name:   u.first_name || '',
          last_name:    u.last_name  || '',
          email:        u.email      || '',
          role:         'LABOURER',
          phone:        u.phone      || '',
          daily_wage:   l.daily_wage,
          overtime_rate: l.overtime_rate,
          skill:        l.skill || '',
          is_active:    l.is_active !== false,
        };
        if (l.contractor) {
          if (!labsByContractor[l.contractor]) labsByContractor[l.contractor] = [];
          labsByContractor[l.contractor].push(node);
        } else {
          unassignedLabourers.push(node);
        }
      });

      // Build contractor nodes keyed by supervisor_user_id
      const consBySupUser: Record<number, ContractorNode[]> = {};
      const unassignedContractors: ContractorNode[] = [];

      allContractors.forEach((c: any) => {
        const u = c.user_detail || {};
        const node: ContractorNode = {
          id: u.id || c.user,
          contractor_id: c.id,
          username:    u.username     || '',
          first_name:  u.first_name   || '',
          last_name:   u.last_name    || '',
          email:       u.email        || '',
          role:        'CONTRACTOR',
          phone:       u.phone        || '',
          company_name: c.company_name || u.company_name || '',
          is_active:   c.is_active !== false,
          labourers:   labsByContractor[c.id] || [],
        };
        if (c.supervisor) {
          if (!consBySupUser[c.supervisor]) consBySupUser[c.supervisor] = [];
          consBySupUser[c.supervisor].push(node);
        } else {
          unassignedContractors.push(node);
        }
      });

      // Build supervisor nodes
      const supervisors: SupervisorNode[] = allUsers
        .filter((u: any) => u.role === 'SUPERVISOR')
        .map((u: any) => ({
          id: u.id, username: u.username,
          first_name: u.first_name || '', last_name: u.last_name || '',
          email: u.email, role: 'SUPERVISOR',
          phone: u.phone || '',
          contractors: consBySupUser[u.id] || [],
        }));

      const hrUsers: UserNode[] = allUsers
        .filter((u: any) => u.role === 'HR')
        .map((u: any) => ({
          id: u.id, username: u.username,
          first_name: u.first_name || '', last_name: u.last_name || '',
          email: u.email, role: 'HR', phone: u.phone || '',
          company_name: u.company_name || '',
        }));

      setHierarchy({ supervisors, unassignedContractors, unassignedLabourers, hrUsers });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    if (!hierarchy) return null;
    const totalCons = hierarchy.supervisors.reduce((n, s) => n + s.contractors.length, 0)
      + hierarchy.unassignedContractors.length;
    const totalLabs = hierarchy.supervisors.reduce((n, s) =>
      n + s.contractors.reduce((m, c) => m + c.labourers.length, 0), 0
    ) + hierarchy.unassignedContractors.reduce((n, c) => n + c.labourers.length, 0)
      + hierarchy.unassignedLabourers.length;

    return {
      supervisors: hierarchy.supervisors.length,
      contractors: totalCons,
      labourers: totalLabs,
      hrUsers: hierarchy.hrUsers.length,
      unassignedCons: hierarchy.unassignedContractors.length,
      unassignedLabs: hierarchy.unassignedLabourers.length,
    };
  }, [hierarchy]);

  const q = search.toLowerCase().trim();

  const handleExpandToggle = () => {
    setExpandAll(!expandAll);
    setKey(k => k + 1); // force remount so defaultOpen is re-evaluated
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '60px 0', color: '#71717a' }}>
      <div style={{ width: 40, height: 2, background: '#161616', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: '#dc2626', animation: 'loadBar 1s ease infinite' }} />
      </div>
      Building hierarchy...
      <style>{`@keyframes loadBar{from{transform:translateX(-100%)}to{transform:translateX(100%)}}`}</style>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes pageIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .hier-input:focus{border-bottom-color:#dc2626!important;background:#181818!important;}
      `}</style>

      <div style={{ animation: 'pageIn 0.4s cubic-bezier(0.16,1,0.3,1)', color: 'white' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid #161616', position: 'relative' }}>
          <div style={{ position: 'absolute', bottom: -1, left: 0, width: 64, height: 3, background: '#dc2626', borderRadius: 2 }} />
          <div>
            <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: '#71717a', marginBottom: 6, fontWeight: 600 }}>Organisation</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 44, fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: -1, lineHeight: 1 }}>
              Hierarchy View
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={load} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', color: '#d4d4d8', border: '1px solid #3f3f46', padding: '9px 16px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', cursor: 'pointer', borderRadius: 6 }}>
              Refresh
            </button>
            <button onClick={handleExpandToggle} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#141414', color: '#d4d4d8', border: '1px solid #3f3f46', padding: '9px 16px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', cursor: 'pointer', borderRadius: 6 }}>
              <TreePine size={12} />
              {expandAll ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 2, marginBottom: 28 }}>
            {[
              { label: 'HR Admins',   val: stats.hrUsers,      color: '#a78bfa' },
              { label: 'Supervisors', val: stats.supervisors,   color: '#60a5fa' },
              { label: 'Contractors', val: stats.contractors,   color: '#facc15' },
              { label: 'Labourers',   val: stats.labourers,     color: '#4ade80' },
            ].map(s => (
              <div key={s.label} style={{ background: '#0d0d0d', border: '1px solid #161616', padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: s.color }} />
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color: '#71717a', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 40, fontWeight: 900, lineHeight: 1, color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Unassigned warnings ── */}
        {stats && (stats.unassignedCons > 0 || stats.unassignedLabs > 0) && (
          <div style={{ marginBottom: 20, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={14} color="#ef4444" />
            <span style={{ fontSize: 12, color: '#f87171' }}>
              {[
                stats.unassignedCons > 0 && `${stats.unassignedCons} contractor${stats.unassignedCons > 1 ? 's' : ''} with no supervisor`,
                stats.unassignedLabs > 0 && `${stats.unassignedLabs} labourer${stats.unassignedLabs > 1 ? 's' : ''} with no contractor`,
              ].filter(Boolean).join(' · ')}
            </span>
            <span style={{ fontSize: 13, color: '#a1a1aa', marginLeft: 4 }}>— shown below the main tree</span>
          </div>
        )}

        {/* ── Search + filter ── */}
        <div style={{ position: 'relative', marginBottom: 24 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa', pointerEvents: 'none' }} />
          <input
            className="hier-input"
            type="text"
            placeholder="Search name, username, skill, company…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', background: '#141414', border: '1px solid #1e1e1e',
              borderBottom: '2px solid #222', color: 'white', padding: '12px 16px 12px 36px',
              fontFamily: "'Inter', sans-serif", fontSize: 14, outline: 'none',
              boxSizing: 'border-box', transition: 'border-color 0.2s', borderRadius: 6,
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
          )}
        </div>

        {/* ── Legend ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, padding: '10px 14px', background: '#0a0a0a', border: '1px solid #161616', borderRadius: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', color: '#a1a1aa', fontWeight: 700 }}>Legend</span>
          {Object.entries(ROLE).map(([role, { color, Icon }]) => (
            <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 3, height: 14, background: color, borderRadius: 2 }} />
              <Icon size={11} color={color} />
              <span style={{ fontSize: 12, color, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 2, fontWeight: 700 }}>{role}</span>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: 13, color: '#71717a' }}>Click any row to expand / collapse</div>
        </div>

        {/* ── HR Admins strip ── */}
        {hierarchy && hierarchy.hrUsers.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 24, height: 2, background: '#a78bfa' }} />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#71717a' }}>HR Administration</span>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {hierarchy.hrUsers.map(hr => {
                const { color, bg, border, Icon } = ROLE.HR;
                const name = fullName(hr);
                if (q && !name.toLowerCase().includes(q) && !hr.username.toLowerCase().includes(q)) return null;
                return (
                  <div key={hr.id} style={{ background: bg, border: `1px solid ${border}`, borderLeft: `3px solid ${color}`, borderRadius: 6, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 220 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={15} color={color} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: 'white', fontSize: 13 }}>{name}</div>
                      <div style={{ fontSize: 13, color: '#71717a' }}>{hr.email}</div>
                    </div>
                    {hr.company_name && (
                      <span style={{ fontSize: 12, color, background: `${color}12`, padding: '2px 8px', borderRadius: 8, fontWeight: 700, marginLeft: 'auto' }}>{hr.company_name}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Section divider ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 24, height: 2, background: '#60a5fa' }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#71717a' }}>
            Supervisors → Contractors → Labourers
          </span>
          {q && (
            <span style={{ fontSize: 13, color: '#dc2626', marginLeft: 'auto' }}>
              Showing results for "{search}"
            </span>
          )}
        </div>

        {/* ── Main tree ── */}
        {hierarchy && (
          <div key={key}>
            {hierarchy.supervisors.length === 0 && !q ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#71717a', border: '1px solid #1a1a1a', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 4, textTransform: 'uppercase', fontSize: 13 }}>
                No supervisors found
              </div>
            ) : (
              hierarchy.supervisors.map(sv => (
                <SupervisorBranch
                  key={sv.id} sv={sv} depth={0}
                  search={q} defaultOpen={expandAll || !!q}
                />
              ))
            )}

            {/* ── Unassigned Contractors ── */}
            <UnassignedSection
              title="Contractors without supervisor"
              color={ROLE.CONTRACTOR.color}
              icon={ROLE.CONTRACTOR.Icon}
              count={hierarchy.unassignedContractors.length}
            >
              {hierarchy.unassignedContractors.map(c => (
                <ContractorBranch
                  key={c.id} con={c} depth={0}
                  search={q} defaultOpen={true}
                />
              ))}
            </UnassignedSection>

            {/* ── Unassigned Labourers ── */}
            <UnassignedSection
              title="Labourers without contractor"
              color={ROLE.LABOURER.color}
              icon={ROLE.LABOURER.Icon}
              count={hierarchy.unassignedLabourers.length}
            >
              {hierarchy.unassignedLabourers.map(l => (
                <LabourerCard
                  key={l.id} lab={l} depth={0} search={q}
                />
              ))}
            </UnassignedSection>
          </div>
        )}

      </div>
    </>
  );
}
