// frontend/src/pages/ProjectPortal.tsx  —  NEW FILE
//
// Separate portal for Supervisors (and HR) to:
//   1. Create / manage projects
//   2. Assign contractors from their pool to a project
//   3. View project-based contractor payroll
//
// This page lives at /projects and is shown in the sidebar only to HR & SUPERVISOR.

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { extractResults } from '../utils/pagination';
import { Plus, X, RefreshCw, ChevronDown, ChevronUp, Users, Briefcase, DollarSign } from 'lucide-react';

// ─── styles ──────────────────────────────────────────────────────────────────
const S = {
  label:    { display: 'block', fontSize: 9, letterSpacing: 4, textTransform: 'uppercase' as const, color: '#3f3f46', fontWeight: 700, marginBottom: 8 },
  input:    { width: '100%', background: '#141414', border: '1px solid #1e1e1e', borderBottom: '2px solid #222', color: 'white', padding: '11px 13px', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const, fontFamily: "'Barlow',sans-serif", transition: 'border-color 0.2s' },
  select:   { width: '100%', background: '#141414', border: '1px solid #1e1e1e', borderBottom: '2px solid #222', color: 'white', padding: '11px 13px', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const, fontFamily: "'Barlow',sans-serif" },
  btn:      { display: 'inline-flex', alignItems: 'center', gap: 8, background: '#dc2626', color: 'white', border: 'none', padding: '10px 20px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' as const, cursor: 'pointer', clipPath: 'polygon(0 0,92% 0,100% 25%,100% 100%,8% 100%,0 75%)' },
  btnSm:    { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#dc2626', color: 'white', border: 'none', padding: '7px 14px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, cursor: 'pointer' },
  btnGhost: { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: '#52525b', border: '1px solid #1e1e1e', padding: '9px 18px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' as const, cursor: 'pointer' },
  btnDanger:{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(220,38,38,0.07)', color: '#f87171', border: '1px solid rgba(220,38,38,0.2)', padding: '6px 12px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, cursor: 'pointer' },
  overlay:  { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 },
  modal:    { background: '#0d0d0d', border: '1px solid #1e1e1e', borderTop: '3px solid #dc2626', width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' as const, padding: 28 },
  card:     { background: '#0d0d0d', border: '1px solid #1a1a1a' } as React.CSSProperties,
  th:       { fontSize: 9, letterSpacing: 3, textTransform: 'uppercase' as const, color: '#3f3f46', fontWeight: 700, padding: '10px 14px', textAlign: 'left' as const, background: '#0a0a0a' },
  td:       { padding: '12px 14px', fontSize: 13, color: '#a1a1aa', borderBottom: '1px solid #0f0f0f' },
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:    '#4ade80',
  COMPLETED: '#60a5fa',
  ON_HOLD:   '#facc15',
  PENDING:   '#facc15',
  APPROVED:  '#60a5fa',
  PAID:      '#4ade80',
  VOID:      '#3f3f46',
  REMOVED:   '#3f3f46',
};

function Badge({ val }: { val: string }) {
  const c = STATUS_COLOR[val] || '#71717a';
  return (
    <span style={{ fontSize: 9, color: c, background: `${c}15`, padding: '3px 9px', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', border: `1px solid ${c}25` }}>
      {val}
    </span>
  );
}

function PageHeader({ sub, title }: { sub: string; title: string }) {
  return (
    <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid #161616', position: 'relative' }}>
      <div style={{ position: 'absolute', bottom: -1, left: 0, width: 64, height: 3, background: '#dc2626' }} />
      <div style={{ fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', color: '#71717a', marginBottom: 4, fontWeight: 600 }}>{sub}</div>
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 40, fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: -1 }}>{title}</div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function ProjectPortal() {
  const { user } = useAuth();
  if (!user || (user.role !== 'HR' && user.role !== 'SUPERVISOR')) {
    return <div style={{ color: '#52525b', padding: 40 }}>Access denied.</div>;
  }
  return <ProjectPortalContent role={user.role} />;
}

function ProjectPortalContent({ role }: { role: string }) {
  const [projects,    setProjects]    = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [showCreate,  setShowCreate]  = useState(false);
  const [expandedId,  setExpandedId]  = useState<number | null>(null);

  // project create form
  const blankProject = { name: '', supervisor: '', location: '', start_date: '', end_date: '', description: '', status: 'ACTIVE' };
  const [pForm,       setPForm]       = useState(blankProject);
  const [pSaving,     setPSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pr, sv] = await Promise.all([
        apiClient.get('/attendance/projects/'),
        apiClient.get('/auth/users/?role=SUPERVISOR'),
      ]);
      setProjects(extractResults<any>(pr.data));
      setSupervisors(extractResults<any>(sv.data));
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setPSaving(true);
    try {
      await apiClient.post('/attendance/projects/', {
        ...pForm,
        supervisor: pForm.supervisor || null,
        end_date:   pForm.end_date   || null,
      });
      setShowCreate(false); setPForm(blankProject); load();
    } catch (err: any) { alert(JSON.stringify(err.response?.data)); }
    finally { setPSaving(false); }
  };

  const updateProjectStatus = async (id: number, newStatus: string) => {
    try {
      await apiClient.patch(`/attendance/projects/${id}/`, { status: newStatus });
      load();
    } catch (err: any) { alert(JSON.stringify(err.response?.data)); }
  };

  const active    = projects.filter(p => p.status === 'ACTIVE');
  const completed = projects.filter(p => p.status === 'COMPLETED');
  const onHold    = projects.filter(p => p.status === 'ON_HOLD');

  return (
    <div style={{ animation: 'pageIn 0.4s ease' }}>
      <style>{`
        @keyframes pageIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .pp-row:hover td{background:#111!important}
        .pp-input:focus{border-bottom-color:#dc2626!important}
        select option{background:#141414;color:white}
      `}</style>

      <PageHeader sub={role === 'HR' ? 'HR Administration' : 'Supervisor Portal'} title="Project Management" />

      {/* Summary strips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2, marginBottom: 24 }}>
        {[
          { label: 'Active Projects',    val: active.length,    color: '#4ade80', icon: <Briefcase size={14} /> },
          { label: 'On Hold',            val: onHold.length,    color: '#facc15', icon: <RefreshCw size={14} /> },
          { label: 'Completed',          val: completed.length, color: '#60a5fa', icon: <DollarSign size={14} /> },
        ].map(s => (
          <div key={s.label} style={{ ...S.card, padding: '16px 20px', borderTop: `2px solid ${s.color}` }}>
            <div style={{ fontSize: 9, letterSpacing: 4, color: '#3f3f46', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: s.color }}>{s.icon}</span>{s.label}
            </div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 36, fontWeight: 900, color: s.color, letterSpacing: -1 }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 24, height: 2, background: '#dc2626' }} />
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color: '#52525b' }}>
            {projects.length} Projects
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={S.btnGhost} onClick={load}><RefreshCw size={11} /> Refresh</button>
          <button style={S.btn}      onClick={() => setShowCreate(true)}><Plus size={12} /> New Project</button>
        </div>
      </div>

      {/* Project list */}
      {loading ? (
        <div style={{ ...S.card, padding: '40px 0', textAlign: 'center', color: '#3f3f46', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 4, textTransform: 'uppercase', fontSize: 12 }}>Loading...</div>
      ) : projects.length === 0 ? (
        <div style={{ ...S.card, padding: '60px 20px', textAlign: 'center', color: '#3f3f46', fontSize: 13 }}>
          No projects yet. Create your first project to get started.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {projects.map(p => (
            <ProjectRow
              key={p.id}
              project={p}
              role={role}
              supervisors={supervisors}
              isExpanded={expandedId === p.id}
              onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
              onStatusChange={updateProjectStatus}
              onRefresh={load}
            />
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreate && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #1a1a1a' }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 900, color: 'white', textTransform: 'uppercase' }}>New Project</div>
              <button onClick={() => setShowCreate(false)} style={{ background: '#1a1a1a', border: 'none', color: '#a1a1aa', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={13} /></button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={S.label}>Project Name *</label>
                  <input className="pp-input" style={S.input} required value={pForm.name} onChange={e => setPForm({ ...pForm, name: e.target.value })} />
                </div>
                {role === 'HR' && (
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={S.label}>Supervisor</label>
                    <select className="pp-input" style={S.select} value={pForm.supervisor} onChange={e => setPForm({ ...pForm, supervisor: e.target.value })}>
                      <option value="">— Select Supervisor —</option>
                      {supervisors.map(s => (
                        <option key={s.id} value={s.id}>{s.first_name} {s.last_name || s.username}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label style={S.label}>Location</label>
                  <input className="pp-input" style={S.input} value={pForm.location} onChange={e => setPForm({ ...pForm, location: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>Status</label>
                  <select className="pp-input" style={S.select} value={pForm.status} onChange={e => setPForm({ ...pForm, status: e.target.value })}>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_HOLD">On Hold</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>Start Date *</label>
                  <input className="pp-input" type="date" style={S.input} required value={pForm.start_date} onChange={e => setPForm({ ...pForm, start_date: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>End Date</label>
                  <input className="pp-input" type="date" style={S.input} value={pForm.end_date} onChange={e => setPForm({ ...pForm, end_date: e.target.value })} />
                  <div style={{ fontSize: 10, color: '#52525b', marginTop: 4 }}>Sets project duration → contractor fee auto-calc</div>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={S.label}>Description</label>
                  <input className="pp-input" style={S.input} value={pForm.description} onChange={e => setPForm({ ...pForm, description: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={pSaving} style={{ ...S.btn, background: pSaving ? '#27272a' : '#dc2626', clipPath: pSaving ? 'none' : undefined }}>
                  {pSaving ? 'Creating...' : 'Create Project'}
                </button>
                <button type="button" style={S.btnGhost} onClick={() => setShowCreate(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Single project row with expandable contractor assignment panel ────────────
function ProjectRow({
  project, role, supervisors, isExpanded, onToggle, onStatusChange, onRefresh,
}: {
  project: any; role: string; supervisors: any[];
  isExpanded: boolean; onToggle: () => void;
  onStatusChange: (id: number, s: string) => void;
  onRefresh: () => void;
}) {
  const [assignments,  setAssignments]  = useState<any[]>([]);
  const [contractors,  setContractors]  = useState<any[]>([]);
  const [loadingInner, setLoadingInner] = useState(false);
  const [showAssign,   setShowAssign]   = useState(false);
  const [aForm,        setAForm]        = useState({ contractor: '', contractor_fee: '', advance_paid: '0', notes: '' });
  const [aSaving,      setASaving]      = useState(false);

  const loadInner = useCallback(async () => {
    setLoadingInner(true);
    try {
      const [aRes, cRes] = await Promise.all([
        apiClient.get(`/attendance/assignments/?project=${project.id}`),
        apiClient.get(role === 'HR' ? '/workforce/contractors/' : `/workforce/contractors/?supervisor_project=${project.id}`),
      ]);
      setAssignments(extractResults<any>(aRes.data));
      setContractors(extractResults<any>(cRes.data));
    } catch {}
    finally { setLoadingInner(false); }
  }, [project.id, role]);

  useEffect(() => {
    if (isExpanded) loadInner();
  }, [isExpanded, loadInner]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setASaving(true);
    try {
      await apiClient.post('/attendance/assignments/', {
        project:        project.id,
        contractor:     parseInt(aForm.contractor),
        contractor_fee: parseFloat(aForm.contractor_fee) || 0,
        advance_paid:   parseFloat(aForm.advance_paid) || 0,
        notes:          aForm.notes,
      });
      setShowAssign(false);
      setAForm({ contractor: '', contractor_fee: '', advance_paid: '0', notes: '' });
      loadInner(); onRefresh();
    } catch (err: any) { alert(JSON.stringify(err.response?.data)); }
    finally { setASaving(false); }
  };

  const removeAssignment = async (id: number) => {
    if (!window.confirm('Remove this contractor from the project?')) return;
    try {
      await apiClient.patch(`/attendance/assignments/${id}/`, { status: 'REMOVED' });
      loadInner();
    } catch {}
  };

  // contractors not already assigned (active)
  const assignedIds = assignments.filter(a => a.status === 'ACTIVE').map(a => a.contractor);
  const available   = contractors.filter(c => !assignedIds.includes(c.id));

  // duration hint for the fee field
  const dur = project.duration_days;

  // Compute preview fee when contractor is selected
  const selectedContractor = aForm.contractor
    ? contractors.find(c => String(c.id) === aForm.contractor)
    : null;
  const previewFee = selectedContractor && dur && !aForm.contractor_fee
    ? (parseFloat(selectedContractor.daily_wage || 0) * dur).toFixed(2)
    : null;

  return (
    <div style={{ ...S.card, overflow: 'hidden' }}>
      {/* Project header row */}
      <div
        onClick={onToggle}
        style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', padding: '16px 20px', cursor: 'pointer', background: isExpanded ? '#111' : '#0d0d0d', transition: 'background 0.15s' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* Colour strip */}
          <div style={{ width: 3, height: 36, background: STATUS_COLOR[project.status] || '#3f3f46', flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 17, fontWeight: 800, color: 'white', letterSpacing: 0.5 }}>
              {project.name}
            </div>
            <div style={{ fontSize: 11, color: '#52525b', marginTop: 2 }}>
              {project.supervisor_name || '—'} · {project.location || 'No location'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Badge val={project.status} />
            <span style={{ fontSize: 10, color: '#3f3f46', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1 }}>
              {project.start_date} → {project.end_date || '?'}
            </span>
            {dur && (
              <span style={{ fontSize: 10, color: '#60a5fa', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1 }}>
                {dur} days
              </span>
            )}
            <span style={{ fontSize: 10, color: '#71717a', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1 }}>
              <Users size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
              {project.assigned_contractor_count} assigned
            </span>
          </div>
        </div>
        <div style={{ color: '#3f3f46' }}>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded panel */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid #161616', padding: '20px 20px 24px' }}>

          {/* Status change buttons */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {project.status === 'ACTIVE' && (
              <>
                <button style={S.btnGhost} onClick={() => onStatusChange(project.id, 'ON_HOLD')}>Pause Project</button>
                <button style={S.btnSm} onClick={() => { if (window.confirm('Mark this project COMPLETED? Contractor payroll will be finalised.')) onStatusChange(project.id, 'COMPLETED'); }}>
                  ✓ Complete Project
                </button>
              </>
            )}
            {project.status === 'ON_HOLD' && (
              <button style={S.btnSm} onClick={() => onStatusChange(project.id, 'ACTIVE')}>Resume Project</button>
            )}
          </div>

          {/* Contractor assignments */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', color: '#52525b', fontWeight: 700, fontFamily: "'Barlow Condensed',sans-serif", display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 20, height: 2, background: '#dc2626' }} />
              Contractor Assignments
            </div>
            {project.status === 'ACTIVE' && available.length > 0 && (
              <button style={{ ...S.btnSm, clipPath: 'none' }} onClick={() => setShowAssign(true)}>
                <Plus size={11} /> Assign Contractor
              </button>
            )}
          </div>

          {loadingInner ? (
            <div style={{ color: '#3f3f46', fontSize: 12, padding: '20px 0', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 3, textTransform: 'uppercase' }}>Loading...</div>
          ) : assignments.length === 0 ? (
            <div style={{ color: '#3f3f46', fontSize: 13, padding: '20px 0', borderTop: '1px solid #111' }}>
              No contractors assigned yet. {project.status === 'ACTIVE' ? 'Click "Assign Contractor" to get started.' : ''}
            </div>
          ) : (
            <div style={{ ...S.card, overflow: 'hidden', marginBottom: 4 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Contractor', 'Daily Wage', 'Duration', 'Project Fee', 'Advance', 'Net Payable', 'Payroll', 'Status', ''].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a, i) => {
                    const bg = i % 2 === 0 ? '#0d0d0d' : '#0a0a0a';
                    const net = (a.computed_fee - parseFloat(a.advance_paid || 0)).toFixed(2);
                    return (
                      <tr key={a.id} className="pp-row">
                        <td style={{ ...S.td, background: bg, color: 'white', fontWeight: 600 }}>{a.contractor_name}</td>
                        <td style={{ ...S.td, background: bg }}>₹{Number(a.daily_wage).toLocaleString('en-IN')}</td>
                        <td style={{ ...S.td, background: bg }}>{a.duration_days ? `${a.duration_days}d` : '—'}</td>
                        <td style={{ ...S.td, background: bg, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, color: '#facc15' }}>
                          ₹{Number(a.computed_fee).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ ...S.td, background: bg, color: '#f87171' }}>
                          {parseFloat(a.advance_paid || 0) > 0 ? `-₹${Number(a.advance_paid).toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td style={{ ...S.td, background: bg, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, color: '#4ade80', fontSize: 15 }}>
                          ₹{Number(net).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ ...S.td, background: bg }}>
                          {a.payroll_status ? <Badge val={a.payroll_status} /> : <span style={{ color: '#3f3f46', fontSize: 11 }}>—</span>}
                        </td>
                        <td style={{ ...S.td, background: bg }}><Badge val={a.status} /></td>
                        <td style={{ ...S.td, background: bg }}>
                          {a.status === 'ACTIVE' && project.status === 'ACTIVE' && (
                            <button style={S.btnDanger} onClick={() => removeAssignment(a.id)}>Remove</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Assign Contractor inline form */}
          {showAssign && (
            <div style={S.overlay}>
              <div style={S.modal}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #1a1a1a' }}>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: 4, color: '#dc2626', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Project: {project.name}</div>
                    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 900, color: 'white', textTransform: 'uppercase' }}>Assign Contractor</div>
                  </div>
                  <button onClick={() => setShowAssign(false)} style={{ background: '#1a1a1a', border: 'none', color: '#a1a1aa', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={13} />
                  </button>
                </div>

                {/* Info box */}
                <div style={{ background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.1)', borderLeft: '3px solid #60a5fa', padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#93c5fd' }}>
                  Project period: <strong style={{ color: 'white' }}>{project.start_date} → {project.end_date || '?'}</strong>
                  {dur && <> · <strong style={{ color: 'white' }}>{dur} days</strong></>}
                  <br />
                  <span style={{ color: '#71717a' }}>Fee auto-calc = contractor's daily_wage × {dur ?? '?'} days. Override below if needed.</span>
                </div>

                <form onSubmit={handleAssign}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={S.label}>Contractor *</label>
                      <select className="pp-input" style={S.select} required value={aForm.contractor}
                        onChange={e => setAForm({ ...aForm, contractor: e.target.value, contractor_fee: '' })}>
                        <option value="">— Select from your pool —</option>
                        {available.map(c => {
                          const n = c.user_detail;
                          const name = n ? `${n.first_name || ''} ${n.last_name || n.username || ''}`.trim() : `Contractor #${c.id}`;
                          const autoFee = dur ? (parseFloat(c.daily_wage || 0) * dur).toFixed(2) : '?';
                          return (
                            <option key={c.id} value={c.id}>
                              {name} · ₹{Number(c.daily_wage).toLocaleString('en-IN')}/day · Auto fee: ₹{autoFee}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <label style={S.label}>Project Fee (₹) <span style={{ color: '#52525b', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— leave blank to auto-calc</span></label>
                      <input className="pp-input" type="number" min="0" step="0.01" style={S.input}
                        placeholder={previewFee ? `Auto: ₹${previewFee}` : 'e.g. 60000'}
                        value={aForm.contractor_fee}
                        onChange={e => setAForm({ ...aForm, contractor_fee: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={S.label}>Advance Paid (₹)</label>
                      <input className="pp-input" type="number" min="0" step="0.01" style={S.input}
                        value={aForm.advance_paid}
                        onChange={e => setAForm({ ...aForm, advance_paid: e.target.value })}
                      />
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={S.label}>Notes</label>
                      <input className="pp-input" style={S.input}
                        value={aForm.notes}
                        onChange={e => setAForm({ ...aForm, notes: e.target.value })}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" disabled={aSaving}
                      style={{ ...S.btn, background: aSaving ? '#27272a' : '#dc2626', clipPath: aSaving ? 'none' : undefined }}>
                      {aSaving ? 'Assigning...' : 'Assign & Create Payroll'}
                    </button>
                    <button type="button" style={S.btnGhost} onClick={() => setShowAssign(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
