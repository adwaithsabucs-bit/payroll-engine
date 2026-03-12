// frontend/src/pages/AttendancePage.tsx — REPLACE ENTIRE FILE

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { extractResults } from '../utils/pagination';
import { Calendar, RefreshCw, Plus, X, Briefcase, HardHat, Info } from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0];

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  PRESENT:  { color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  label: 'Present'  },
  ABSENT:   { color: '#f87171', bg: 'rgba(248,113,113,0.12)', label: 'Absent'   },
  HALF_DAY: { color: '#facc15', bg: 'rgba(250,204,21,0.12)',  label: 'Half Day' },
  LEAVE:    { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  label: 'Leave'    },
  UNMARKED: { color: '#52525b', bg: 'rgba(82,82,91,0.12)',    label: 'Unmarked' },
};
const STATUSES = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE'] as const;

// ── Types ──────────────────────────────────────────────────────
interface AttendanceSummary {
  total: number; present: number; absent: number;
  half_day: number; leave: number; unmarked: number;
}
interface PersonDetail {
  id: number; name: string; status: string | null;
  company?: string; type?: string; daily_wage?: string; contractor?: string;
}
interface ProjectMonitor {
  project_id: number; project_name: string; supervisor_name: string; date: string;
  contractor_summary: AttendanceSummary; contractor_details: PersonDetail[];
  labourer_summary:   AttendanceSummary; labourer_details:   PersonDetail[];
}

// ── Colour bar ──────────────────────────────────────────────────
const ColorBar = ({
  summary, onClick, height = 10,
}: { summary: AttendanceSummary; onClick?: () => void; height?: number }) => {
  const { total, present, absent, half_day, leave, unmarked } = summary;
  if (!total) return <div style={{ fontSize: 11, color: '#3f3f46' }}>No members</div>;

  const pct = (n: number) => `${((n / total) * 100).toFixed(1)}%`;
  const segments = [
    { k: 'present',  v: present,  c: '#4ade80' },
    { k: 'half_day', v: half_day, c: '#facc15' },
    { k: 'leave',    v: leave,    c: '#60a5fa' },
    { k: 'absent',   v: absent,   c: '#f87171' },
    { k: 'unmarked', v: unmarked, c: '#3f3f46' },
  ].filter(s => s.v > 0);

  const legend = [
    { k: 'present',  v: present,  c: '#4ade80', l: 'Present'  },
    { k: 'half_day', v: half_day, c: '#facc15', l: 'Half Day' },
    { k: 'leave',    v: leave,    c: '#60a5fa', l: 'Leave'    },
    { k: 'absent',   v: absent,   c: '#f87171', l: 'Absent'   },
    { k: 'unmarked', v: unmarked, c: '#52525b', l: 'Unmarked' },
  ].filter(x => x.v > 0);

  return (
    <div style={{ width: '100%' }}>
      <div
        onClick={onClick}
        title={onClick ? 'Click for details' : undefined}
        style={{
          display: 'flex', height, borderRadius: height / 2, overflow: 'hidden',
          cursor: onClick ? 'pointer' : 'default',
          border: '1px solid rgba(255,255,255,0.05)', gap: 1,
        }}
      >
        {segments.map(s => (
          <div key={s.k} style={{ width: pct(s.v), background: s.c, minWidth: s.v > 0 ? 3 : 0 }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
        {legend.map(x => (
          <span key={x.k} style={{ fontSize: 10, color: x.c, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, background: x.c, borderRadius: '50%', display: 'inline-block' }} />
            {x.l}: {x.v}
          </span>
        ))}
        <span style={{ fontSize: 10, color: '#3f3f46', marginLeft: 'auto' }}>{total} total</span>
      </div>
    </div>
  );
};

// ── Detail modal ────────────────────────────────────────────────
const DetailModal = ({
  title, details, onClose,
}: { title: string; details: PersonDetail[]; onClose: () => void }) => (
  <div
    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    onClick={onClose}
  >
    <div
      style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 12, padding: 28, width: '100%', maxWidth: 540, maxHeight: '80vh', overflow: 'auto', animation: 'modalIn 0.2s ease' }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: 'white' }}>
          {title}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', padding: 4 }}>
          <X size={16} />
        </button>
      </div>

      {/* Status legend */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
          <span key={k} style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: v.color, background: v.bg, padding: '3px 8px', borderRadius: 8, textTransform: 'uppercase', fontFamily: "'Barlow Condensed',sans-serif" }}>
            {v.label}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {details.map((p, i) => {
          const st   = p.status || 'UNMARKED';
          const conf = STATUS_CONFIG[st] || STATUS_CONFIG.UNMARKED;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
              background: conf.bg, border: `1px solid ${conf.color}22`,
              borderLeft: `3px solid ${conf.color}`, borderRadius: 6,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{p.name}</div>
                {p.company    && <div style={{ fontSize: 11, color: '#71717a' }}>{p.company}</div>}
                {p.contractor && <div style={{ fontSize: 11, color: '#52525b' }}>under {p.contractor}</div>}
                {p.daily_wage && <div style={{ fontSize: 10, color: '#52525b' }}>₹{p.daily_wage}/day</div>}
              </div>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: 2, color: conf.color,
                background: `${conf.color}15`, padding: '3px 10px', borderRadius: 8,
                fontFamily: "'Barlow Condensed',sans-serif", textTransform: 'uppercase',
              }}>
                {conf.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

// ── Status toggle button ────────────────────────────────────────
const StatusBtn = ({
  current, value, onChange,
}: { current: string; value: typeof STATUSES[number]; onChange: (v: string) => void }) => {
  const conf   = STATUS_CONFIG[value];
  const active = current === value;
  return (
    <button onClick={() => onChange(value)} style={{
      padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 10,
      fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: 2,
      textTransform: 'uppercase', transition: 'all 0.15s',
      background: active ? conf.bg    : 'transparent',
      color:      active ? conf.color : '#52525b',
      border:     `1px solid ${active ? conf.color : '#1e1e1e'}`,
    }}>
      {conf.label}
    </button>
  );
};

// ── Add Temp Labourer modal ─────────────────────────────────────
const AddTempModal = ({
  onClose, onAdd,
}: { onClose: () => void; onAdd: (data: any) => void }) => {
  const [form, setForm] = useState({ name: '', phone: '', skill: '', daily_wage: '' });
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 12, padding: 28, width: 400, animation: 'modalIn 0.2s ease' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: 'white' }}>Add Temp Labourer</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer' }}><X size={16} /></button>
        </div>
        {[
          { key: 'name',       label: 'Full Name *',       type: 'text'   },
          { key: 'phone',      label: 'Phone',             type: 'text'   },
          { key: 'skill',      label: 'Skill',             type: 'text'   },
          { key: 'daily_wage', label: 'Daily Wage (₹) *',  type: 'number' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: '#3f3f46', fontWeight: 600, marginBottom: 8 }}>{f.label}</label>
            <input
              type={f.type} value={(form as any)[f.key]}
              onChange={e => setForm({ ...form, [f.key]: e.target.value })}
              style={{ width: '100%', background: '#141414', border: '1px solid #1e1e1e', borderBottom: '2px solid #222', color: 'white', padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        ))}
        <button
          onClick={() => { if (form.name && form.daily_wage) { onAdd(form); onClose(); } }}
          style={{ width: '100%', background: '#dc2626', color: 'white', border: 'none', padding: 13, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', cursor: 'pointer' }}
        >
          Add Labourer
        </button>
      </div>
    </div>
  );
};

// ── Shared styles ───────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  background: '#141414', border: '1px solid #1e1e1e', borderBottom: '2px solid #222',
  color: 'white', padding: '10px 14px', fontSize: 14, outline: 'none',
  fontFamily: "'Inter',sans-serif", cursor: 'pointer', width: '100%', boxSizing: 'border-box',
};
const tableHead: React.CSSProperties = {
  background: '#111', padding: '10px 14px', fontSize: 9, letterSpacing: 3,
  textTransform: 'uppercase', color: '#3f3f46', fontWeight: 700, textAlign: 'left',
};
const tableCell: React.CSSProperties = {
  padding: '12px 14px', fontSize: 13, color: 'white', borderTop: '1px solid #111',
};

// ── HR Monitor section ──────────────────────────────────────────
function HRMonitorView({
  monitorData, loading, onOpenModal,
}: {
  monitorData: ProjectMonitor[];
  loading: boolean;
  onOpenModal: (title: string, details: PersonDetail[]) => void;
}) {
  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#3f3f46' }}>Loading monitor data…</div>;
  if (!monitorData.length) return <div style={{ padding: 60, textAlign: 'center', color: '#3f3f46', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 4, textTransform: 'uppercase', fontSize: 13 }}>No active projects</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {monitorData.map(proj => (
        <div key={proj.project_id} style={{ background: '#0d0d0d', border: '1px solid #161616', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #111', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>{proj.project_name}</div>
              <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>Supervisor: <span style={{ color: '#a1a1aa' }}>{proj.supervisor_name}</span></div>
            </div>
            <div style={{ fontSize: 10, color: '#3f3f46' }}>{proj.date}</div>
          </div>

          <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Briefcase size={12} color="#facc15" />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: '#facc15' }}>Contractors</span>
                <button onClick={() => onOpenModal(`${proj.project_name} — Contractors`, proj.contractor_details)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#52525b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <Info size={11} />Details
                </button>
              </div>
              <ColorBar summary={proj.contractor_summary} height={12} onClick={() => onOpenModal(`${proj.project_name} — Contractors`, proj.contractor_details)} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <HardHat size={12} color="#4ade80" />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: '#4ade80' }}>Labourers</span>
                <button onClick={() => onOpenModal(`${proj.project_name} — Labourers`, proj.labourer_details)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#52525b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <Info size={11} />Details
                </button>
              </div>
              <ColorBar summary={proj.labourer_summary} height={12} onClick={() => onOpenModal(`${proj.project_name} — Labourers`, proj.labourer_details)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────
export default function AttendancePage() {
  const { user } = useAuth();
  const role      = user?.role;

  const [projects, setProjects]       = useState<any[]>([]);
  const [projectId, setProjectId]     = useState('');
  const [selDate, setSelDate]         = useState(today);
  const [loading, setLoading]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [msg, setMsg]                 = useState('');
  const [err, setErr]                 = useState('');
  const [modalData, setModalData]     = useState<{ title: string; details: PersonDetail[] } | null>(null);

  // HR
  const [monitorData, setMonitorData] = useState<ProjectMonitor[]>([]);

  // Supervisor
  const [contractorList, setContractorList] = useState<any[]>([]);
  const [contractorAtts, setContractorAtts] = useState<Record<string, string>>({});
  const [supSummary, setSupSummary]         = useState<{ summary: AttendanceSummary; details: PersonDetail[] } | null>(null);

  // Contractor
  const [fixedLabs, setFixedLabs]   = useState<any[]>([]);
  const [tempLabs, setTempLabs]     = useState<any[]>([]);
  const [labAtts, setLabAtts]       = useState<Record<string, string>>({});
  const [labOT, setLabOT]           = useState<Record<string, string>>({});
  const [conSummary, setConSummary] = useState<{ summary: AttendanceSummary; details: PersonDetail[] } | null>(null);
  const [showTempModal, setShowTempModal] = useState(false);

  // ── Load projects on mount ──
  useEffect(() => {
    apiClient.get('/attendance/projects/').then(r => setProjects(extractResults(r.data))).catch(() => {});
  }, []);

  // ── HR Monitor ──
  const loadMonitor = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiClient.get(`/attendance/monitor/?date=${selDate}`);
      setMonitorData(Array.isArray(r.data) ? r.data : []);
    } catch { setErr('Failed to load monitor.'); }
    finally { setLoading(false); }
  }, [selDate]);

  // ── Supervisor: load contractors ──
  // FIX: fetch profiles from /workforce/contractors/ directly so the list
  // is always populated, even before any attendance has been saved today.
  // Existing attendance records are merged on top.
  const loadContractors = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [attRes, profileRes, sumRes] = await Promise.all([
        apiClient.get(`/attendance/contractor/?project=${projectId}&date=${selDate}`),
        apiClient.get('/workforce/contractors/'),
        apiClient.get(`/attendance/summary/?project=${projectId}&date=${selDate}`),
      ]);

      const attList  = extractResults(attRes.data);
      const profiles = extractResults(profileRes.data);

      // map: contractor profile id → today's attendance record
      const attById: Record<number, any> = {};
      attList.forEach((a: any) => { attById[a.contractor] = a; });

      // one row per profile, merged with attendance if it exists
      const merged = profiles.map((p: any) => {
        const att  = attById[p.id];
        const name = [p.user_detail?.first_name, p.user_detail?.last_name].filter(Boolean).join(' ')
                     || p.user_detail?.username || `Contractor #${p.id}`;
        return {
          contractor:      p.id,
          contractor_name: name,
          company:         p.company_name || p.user_detail?.company_name || '—',
          status:          att?.status || 'PRESENT',
        };
      });

      setContractorList(merged);
      const map: Record<string, string> = {};
      merged.forEach((c: any) => { map[String(c.contractor)] = c.status; });
      setContractorAtts(map);
      setSupSummary(sumRes.data);
    } catch { setErr('Failed to load contractors.'); }
    finally { setLoading(false); }
  }, [projectId, selDate]);

  // ── Contractor: load labourers ──
  // FIX: fetch profiles from /workforce/labourers/ directly so labourers
  // always appear, even before attendance has been saved today.
  const loadLabourers = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [attRes, profileRes, tempRes, sumRes] = await Promise.all([
        apiClient.get(`/attendance/labourer/?project=${projectId}&date=${selDate}`),
        apiClient.get('/workforce/labourers/'),
        apiClient.get('/attendance/temp-labourers/'),
        apiClient.get(`/attendance/summary/?project=${projectId}&date=${selDate}`),
      ]);

      const attList  = extractResults(attRes.data);
      const profiles = extractResults(profileRes.data);
      const allTemps = extractResults(tempRes.data);

      // map: labourer profile id → today's attendance record
      const attByLabId: Record<number, any> = {};
      attList.forEach((a: any) => { if (a.labourer) attByLabId[a.labourer] = a; });

      // one row per profile, merged with attendance if it exists
      const fixedRecs = profiles.map((p: any) => {
        const att  = attByLabId[p.id];
        const name = [p.user_detail?.first_name, p.user_detail?.last_name].filter(Boolean).join(' ')
                     || p.user_detail?.username || `Labourer #${p.id}`;
        return {
          labourer:       p.id,
          labourer_name:  name,
          daily_wage:     p.daily_wage,
          status:         att?.status || 'PRESENT',
          overtime_hours: att ? String(att.overtime_hours || '0') : '0',
        };
      });

      // temp labourers: marked + unmarked merged
      const tempRecs      = attList.filter((a: any) => a.temp_labourer);
      const markedTempIds = new Set(tempRecs.map((a: any) => a.temp_labourer));
      const tempEntries   = [
        ...tempRecs,
        ...allTemps
          .filter((t: any) => !markedTempIds.has(t.id))
          .map((t: any) => ({
            temp_labourer:   t.id,
            temp_name:       t.name,
            temp_daily_wage: t.daily_wage,
            status:          'PRESENT',
            overtime_hours:  '0',
          })),
      ];

      setFixedLabs(fixedRecs);
      setTempLabs(tempEntries);

      const atts: Record<string, string> = {};
      const ot:   Record<string, string> = {};
      [...fixedRecs, ...tempEntries].forEach((a: any) => {
        const k = a.labourer ? `f${a.labourer}` : `t${a.temp_labourer}`;
        atts[k] = a.status || 'PRESENT';
        ot[k]   = String(a.overtime_hours || '0');
      });
      setLabAtts(atts);
      setLabOT(ot);
      setConSummary(sumRes.data);
    } catch { setErr('Failed to load labourers.'); }
    finally { setLoading(false); }
  }, [projectId, selDate]);

  // ── Trigger loads on role/project/date change ──
  useEffect(() => {
    setMsg(''); setErr('');
    if (role === 'HR') { loadMonitor(); return; }
    if (role === 'SUPERVISOR' && projectId) { loadContractors(); return; }
    if (role === 'CONTRACTOR' && projectId) { loadLabourers(); return; }
  }, [role, projectId, selDate]);

  // ── Save contractor attendance ──
  const saveContractorAtt = async () => {
    if (!projectId) return;
    setSaving(true); setErr(''); setMsg('');
    try {
      const records = contractorList.map((c: any) => ({
        contractor: c.contractor,
        project:    parseInt(projectId),
        date:       selDate,
        status:     contractorAtts[String(c.contractor)] || 'PRESENT',
      }));
      await apiClient.post('/attendance/contractor/bulk/', { records });
      setMsg('Attendance saved.');
      await loadContractors();
    } catch { setErr('Failed to save attendance.'); }
    finally { setSaving(false); }
  };

  // ── Save labourer attendance ──
  const saveLabourerAtt = async () => {
    if (!projectId) return;
    setSaving(true); setErr(''); setMsg('');
    try {
      const records = [
        ...fixedLabs.map((a: any) => ({
          labourer:       a.labourer,
          project:        parseInt(projectId),
          date:           selDate,
          status:         labAtts[`f${a.labourer}`] || 'PRESENT',
          overtime_hours: parseFloat(labOT[`f${a.labourer}`] || '0'),
        })),
        ...tempLabs.map((a: any) => ({
          temp_labourer:  a.temp_labourer,
          project:        parseInt(projectId),
          date:           selDate,
          status:         labAtts[`t${a.temp_labourer}`] || 'PRESENT',
          overtime_hours: parseFloat(labOT[`t${a.temp_labourer}`] || '0'),
        })),
      ];
      const res = await apiClient.post('/attendance/labourer/bulk/', { records });
      const cleaned = res.data?.temp_cleaned || 0;
      setMsg(`Attendance saved.${cleaned ? ` ${cleaned} temporary labourer(s) from previous days removed.` : ''}`);
      await loadLabourers();
    } catch { setErr('Failed to save attendance.'); }
    finally { setSaving(false); }
  };

  // ── Add temp labourer ──
  const addTempLabourer = async (data: any) => {
    try {
      await apiClient.post('/attendance/temp-labourers/', data);
      await loadLabourers();
    } catch { setErr('Failed to add temp labourer.'); }
  };

  // ── Summary panel (used by SUPERVISOR and CONTRACTOR) ──
  const SummaryPanel = ({
    sum, type, onDetail,
  }: { sum: { summary: AttendanceSummary; details: PersonDetail[] }; type: 'contractor' | 'labourer'; onDetail: () => void }) => (
    <div style={{ background: '#0d0d0d', border: '1px solid #161616', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {type === 'contractor'
          ? <Briefcase size={12} color="#facc15" />
          : <HardHat size={12} color="#4ade80" />
        }
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: type === 'contractor' ? '#facc15' : '#4ade80' }}>
          Today's Status
        </span>
        <button
          onClick={onDetail}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#52525b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
        >
          <Info size={11} />View Detail
        </button>
      </div>
      <ColorBar summary={sum.summary} height={10} onClick={onDetail} />
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes pageIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes modalIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
        .att-sel:focus{border-bottom-color:#dc2626!important;background:#181818!important;}
        .att-row:hover td{background:rgba(255,255,255,0.015)!important;}
      `}</style>

      <div style={{ animation: 'pageIn 0.4s ease', color: 'white' }}>
        {/* ── Page header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid #161616', position: 'relative' }}>
          <div style={{ position: 'absolute', bottom: -1, left: 0, width: 64, height: 3, background: '#dc2626', borderRadius: 2 }} />
          <div>
            <div style={{ fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', color: '#71717a', marginBottom: 6, fontWeight: 600 }}>Daily Record</div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 44, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -1, lineHeight: 1 }}>Attendance</div>
          </div>
        </div>

        {/* ── Controls ── */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Calendar size={14} style={{ position: 'absolute', left: 12, color: '#52525b', pointerEvents: 'none' }} />
            <input
              type="date" value={selDate} onChange={e => setSelDate(e.target.value)}
              className="att-sel"
              style={{ ...inputStyle, paddingLeft: 36, width: 180 }}
            />
          </div>

          {role !== 'HR' && (
            <select
              value={projectId} onChange={e => setProjectId(e.target.value)}
              className="att-sel" style={{ ...inputStyle, width: 260 }}
            >
              <option value="">— Select Project —</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}

          {role === 'HR' && (
            <button
              onClick={loadMonitor}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#141414', color: '#a1a1aa', border: '1px solid #1e1e1e', padding: '10px 18px', cursor: 'pointer', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}
            >
              <RefreshCw size={13} />Refresh
            </button>
          )}
        </div>

        {/* Messages */}
        {msg && <div style={{ background: 'rgba(74,222,128,0.08)', borderLeft: '3px solid #4ade80', padding: '10px 14px', fontSize: 12, color: '#4ade80', marginBottom: 16 }}>{msg}</div>}
        {err && <div style={{ background: 'rgba(220,38,38,0.08)', borderLeft: '3px solid #dc2626', padding: '10px 14px', fontSize: 12, color: '#fca5a5', marginBottom: 16 }}>{err}</div>}

        {/* ═══ HR MONITOR ═══ */}
        {role === 'HR' && (
          <HRMonitorView
            monitorData={monitorData}
            loading={loading}
            onOpenModal={(title, details) => setModalData({ title, details })}
          />
        )}

        {/* ═══ SUPERVISOR: mark contractor attendance ═══ */}
        {role === 'SUPERVISOR' && projectId && (
          <div>
            {supSummary && (
              <SummaryPanel
                sum={supSummary} type="contractor"
                onDetail={() => setModalData({ title: 'Contractor Status Detail', details: supSummary.details })}
              />
            )}

            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#3f3f46' }}>Loading…</div>
            ) : (
              <div style={{ background: '#0d0d0d', border: '1px solid #161616', borderRadius: 10, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={tableHead}>Contractor</th>
                      <th style={tableHead}>Company</th>
                      <th style={tableHead}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contractorList.length === 0 ? (
                      <tr><td colSpan={3} style={{ padding: 40, textAlign: 'center', color: '#3f3f46', fontSize: 13 }}>No contractors found for this project.</td></tr>
                    ) : contractorList.map((c: any) => (
                      <tr key={c.contractor} className="att-row">
                        <td style={tableCell}>{c.contractor_name || `#${c.contractor}`}</td>
                        <td style={{ ...tableCell, color: '#71717a' }}>{c.company || '—'}</td>
                        <td style={tableCell}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {STATUSES.map(s => (
                              <StatusBtn
                                key={s}
                                current={contractorAtts[String(c.contractor)] || 'PRESENT'}
                                value={s}
                                onChange={v => setContractorAtts({ ...contractorAtts, [String(c.contractor)]: v })}
                              />
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {contractorList.length > 0 && (
                  <div style={{ padding: '14px 20px', borderTop: '1px solid #111', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={saveContractorAtt} disabled={saving}
                      style={{ background: '#dc2626', color: 'white', border: 'none', padding: '11px 28px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
                    >
                      {saving ? 'Saving…' : 'Save Attendance'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ CONTRACTOR: mark labourer attendance ═══ */}
        {role === 'CONTRACTOR' && projectId && (
          <div>
            {conSummary && (
              <SummaryPanel
                sum={conSummary} type="labourer"
                onDetail={() => setModalData({ title: 'Labourer Status Detail', details: conSummary.details })}
              />
            )}

            {[
              { label: 'Fixed Labourers',     items: fixedLabs, kp: 'f', idF: 'labourer',     nameF: 'labourer_name' },
              { label: 'Temporary Labourers', items: tempLabs,  kp: 't', idF: 'temp_labourer', nameF: 'temp_name'     },
            ].map(section => section.items.length > 0 && (
              <div key={section.label} style={{ background: '#0d0d0d', border: '1px solid #161616', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: section.kp === 't' ? '#facc15' : '#4ade80' }}>
                    {section.label} ({section.items.length})
                  </span>
                  {section.kp === 't' && (
                    <button
                      onClick={() => setShowTempModal(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(74,222,128,0.08)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)', padding: '5px 12px', cursor: 'pointer', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', borderRadius: 6 }}
                    >
                      <Plus size={11} />Add Temp
                    </button>
                  )}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={tableHead}>Name</th>
                      <th style={tableHead}>Daily Wage</th>
                      <th style={tableHead}>Status</th>
                      <th style={tableHead}>OT Hrs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((a: any) => {
                      const k    = `${section.kp}${a[section.idF]}`;
                      const name = a[section.nameF] || a.labourer_name || a.temp_name || '—';
                      return (
                        <tr key={k} className="att-row">
                          <td style={tableCell}>{name}</td>
                          <td style={{ ...tableCell, color: '#4ade80', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700 }}>
                            ₹{a.daily_wage || a.temp_daily_wage || '0'}
                          </td>
                          <td style={tableCell}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {STATUSES.map(s => (
                                <StatusBtn
                                  key={s}
                                  current={labAtts[k] || 'PRESENT'}
                                  value={s}
                                  onChange={v => setLabAtts({ ...labAtts, [k]: v })}
                                />
                              ))}
                            </div>
                          </td>
                          <td style={tableCell}>
                            <input
                              type="number" min="0" step="0.5" value={labOT[k] || '0'}
                              onChange={e => setLabOT({ ...labOT, [k]: e.target.value })}
                              style={{ width: 64, background: '#141414', border: '1px solid #1e1e1e', color: 'white', padding: '6px 8px', fontSize: 13, outline: 'none', textAlign: 'center' }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}

            {/* Bottom action bar */}
            {(fixedLabs.length > 0 || tempLabs.length > 0) && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  onClick={() => setShowTempModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)', padding: '11px 20px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', cursor: 'pointer' }}
                >
                  <Plus size={12} />Add Temp Labourer
                </button>
                <button
                  onClick={saveLabourerAtt} disabled={saving}
                  style={{ background: '#dc2626', color: 'white', border: 'none', padding: '11px 28px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? 'Saving…' : 'Save Attendance'}
                </button>
              </div>
            )}

            {fixedLabs.length === 0 && tempLabs.length === 0 && !loading && projectId && (
              <div style={{ padding: 60, textAlign: 'center', color: '#3f3f46', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 4, textTransform: 'uppercase', fontSize: 13 }}>
                No labourers assigned.
                <div style={{ marginTop: 16 }}>
                  <button
                    onClick={() => setShowTempModal(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(74,222,128,0.08)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)', padding: '10px 20px', cursor: 'pointer', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}
                  >
                    <Plus size={12} />Add Temp Labourer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Prompt to select project */}
        {role !== 'HR' && !projectId && (
          <div style={{ padding: 60, textAlign: 'center', color: '#3f3f46', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 4, textTransform: 'uppercase', fontSize: 13 }}>
            Select a project above to view and mark attendance.
          </div>
        )}
      </div>

      {/* Modals */}
      {modalData && <DetailModal title={modalData.title} details={modalData.details} onClose={() => setModalData(null)} />}
      {showTempModal && <AddTempModal onClose={() => setShowTempModal(false)} onAdd={addTempLabourer} />}
    </>
  );
}
