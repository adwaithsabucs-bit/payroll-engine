// frontend/src/pages/ProjectPage.tsx — NEW FILE

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { extractResults } from '../utils/pagination';
import {
  FolderOpen, Plus, X, RefreshCw, Users, ChevronDown, ChevronUp,
  MapPin, Calendar, CheckCircle, Clock, AlertCircle,
} from 'lucide-react';

// ── Shared styles ────────────────────────────────────────────────────
const S = {
  card:   { background: '#0d0d0d', border: '1px solid #1a1a1a' } as React.CSSProperties,
  label:  { display: 'block', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#a1a1aa', fontWeight: 700, marginBottom: 8 },
  input:  { width: '100%', background: '#141414', border: '1px solid #1e1e1e', borderBottom: '2px solid #222', color: 'white', padding: '11px 13px', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const, fontFamily: "'Inter',sans-serif", transition: 'border-color 0.2s' },
  select: { width: '100%', background: '#141414', border: '1px solid #1e1e1e', borderBottom: '2px solid #222', color: 'white', padding: '11px 13px', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const, fontFamily: "'Inter',sans-serif" },
  btn:    { display: 'inline-flex', alignItems: 'center', gap: 8, background: '#dc2626', color: 'white', border: 'none', padding: '10px 22px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' as const, cursor: 'pointer' },
  btnGhost: { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: '#d4d4d8', border: '1px solid #3f3f46', padding: '9px 16px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' as const, cursor: 'pointer' },
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 },
  modal:   { background: '#0d0d0d', border: '1px solid #1e1e1e', borderTop: '3px solid #dc2626', width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' as const, padding: 28 },
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:    '#4ade80',
  COMPLETED: '#60a5fa',
  ON_HOLD:   '#facc15',
};

const PAY_COLOR: Record<string, string> = {
  PENDING: '#facc15',
  PAID:    '#4ade80',
};

function StatusBadge({ s }: { s: string }) {
  const c = STATUS_COLOR[s] || '#71717a';
  return (
    <span style={{ fontSize: 13, color: c, background: `${c}15`, padding: '3px 10px', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
      {s.replace('_', ' ')}
    </span>
  );
}

// ── Modal wrapper ────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, paddingBottom: 16, borderBottom: '1px solid #1a1a1a' }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</div>
          <button onClick={onClose} style={{ background: '#1a1a1a', border: 'none', color: '#a1a1aa', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={13} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────
export default function ProjectPage() {
  const { user } = useAuth();
  const role = user?.role;

  const [tab, setTab]           = useState<'projects' | 'assignments'>('projects');
  const [projects, setProjects] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg]           = useState('');
  const [err, setErr]           = useState('');

  const [showProjectModal, setShowProjectModal]     = useState(false);
  const [editProject, setEditProject]               = useState<any>(null);
  const [showAssignModal, setShowAssignModal]       = useState(false);
  const [assignProjectId, setAssignProjectId]       = useState('');
  const [expandedProject, setExpandedProject]       = useState<number | null>(null);
  const [projectAssignments, setProjectAssignments] = useState<Record<number, any[]>>({});

  // ── Load data ──
  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiClient.get('/attendance/projects/');
      setProjects(extractResults(r.data));
    } catch { setErr('Failed to load projects.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadProjects();
    // Load supervisors (HR only)
    if (role === 'HR') {
      apiClient.get('/auth/users/?role=SUPERVISOR').then(r => setSupervisors(extractResults(r.data))).catch(() => {});
    }
    // Load contractors
    apiClient.get('/workforce/contractors/').then(r => setContractors(extractResults(r.data))).catch(() => {});
  }, [role, loadProjects]);

  const loadAssignments = async (projectId: number) => {
    try {
      const r = await apiClient.get(`/attendance/assignments/?project=${projectId}`);
      setProjectAssignments(prev => ({ ...prev, [projectId]: extractResults(r.data) }));
    } catch {}
  };

  const toggleExpand = (projectId: number) => {
    if (expandedProject === projectId) {
      setExpandedProject(null);
    } else {
      setExpandedProject(projectId);
      loadAssignments(projectId);
    }
  };

  // ── Create / Edit project ──
  const [pForm, setPForm] = useState({
    name: '', supervisor: '', location: '', start_date: '', end_date: '', status: 'ACTIVE', description: '',
  });

  const openCreateProject = () => {
    setPForm({ name: '', supervisor: '', location: '', start_date: '', end_date: '', status: 'ACTIVE', description: '' });
    setEditProject(null);
    setShowProjectModal(true);
  };

  const openEditProject = (p: any) => {
    setPForm({
      name:        p.name,
      supervisor:  p.supervisor || '',
      location:    p.location || '',
      start_date:  p.start_date,
      end_date:    p.end_date || '',
      status:      p.status,
      description: p.description || '',
    });
    setEditProject(p);
    setShowProjectModal(true);
  };

  const saveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(''); setErr('');
    const payload = {
      ...pForm,
      supervisor: pForm.supervisor || null,
      end_date:   pForm.end_date   || null,
    };
    try {
      if (editProject) {
        await apiClient.patch(`/attendance/projects/${editProject.id}/`, payload);
        setMsg('Project updated.');
      } else {
        await apiClient.post('/attendance/projects/', payload);
        setMsg('Project created.');
      }
      setShowProjectModal(false);
      loadProjects();
    } catch (e: any) {
      setErr(JSON.stringify(e.response?.data || 'Error saving project.'));
    }
  };

  // ── Assign contractor ──
  const [aForm, setAForm] = useState({ contractor: '', contract_amount: '', notes: '' });

  const openAssign = (projectId: number) => {
    setAssignProjectId(String(projectId));
    setAForm({ contractor: '', contract_amount: '', notes: '' });
    setShowAssignModal(true);
  };

  const saveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      await apiClient.post('/attendance/assignments/', {
        project:         parseInt(assignProjectId),
        contractor:      parseInt(aForm.contractor),
        contract_amount: parseFloat(aForm.contract_amount),
        notes:           aForm.notes,
      });
      setMsg('Contractor assigned. Payroll record created (PENDING).');
      setShowAssignModal(false);
      loadAssignments(parseInt(assignProjectId));
    } catch (e: any) {
      setErr(JSON.stringify(e.response?.data || 'Error assigning contractor.'));
    }
  };

  // ── Approve payout ──
  const approvePayout = async (payrollId: number, projectId: number) => {
    if (!window.confirm('Mark this contractor payment as PAID?')) return;
    try {
      await apiClient.patch(`/payroll/contractor/${payrollId}/`, { status: 'PAID' });
      setMsg('Payment approved and marked PAID.');
      loadAssignments(projectId);
    } catch { setErr('Failed to approve payment.'); }
  };

  // ── Contractors available for a project (not already assigned) ──
  const availableContractors = (projectId: number) => {
    const assigned = new Set((projectAssignments[projectId] || []).map((a: any) => a.contractor));
    return contractors.filter((c: any) => {
      if (assigned.has(c.id)) return false;
      if (role === 'SUPERVISOR') return c.supervisor === user?.id;
      return true;
    });
  };

  return (
    <>
      <style>{`
        @keyframes pageIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes modalIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
        .proj-row:hover{background:#111!important}
        .pr-input:focus{border-bottom-color:#dc2626!important}
        select option{background:#141414;color:white}
      `}</style>

      <div style={{ animation: 'pageIn 0.4s ease', color: 'white' }}>

        {/* Header */}
        <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid #161616', position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ position: 'absolute', bottom: -1, left: 0, width: 64, height: 3, background: '#dc2626' }} />
          <div>
            <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: '#71717a', marginBottom: 4, fontWeight: 600 }}>Management</div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 44, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -1, lineHeight: 1 }}>Projects</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={S.btnGhost} onClick={loadProjects}><RefreshCw size={11} />Refresh</button>
            {(role === 'HR' || role === 'SUPERVISOR') && (
              <button style={S.btn} onClick={openCreateProject}><Plus size={13} />New Project</button>
            )}
          </div>
        </div>

        {/* Messages */}
        {msg && <div style={{ background: 'rgba(74,222,128,0.08)', borderLeft: '3px solid #4ade80', padding: '10px 14px', fontSize: 12, color: '#4ade80', marginBottom: 16 }}>{msg}</div>}
        {err && <div style={{ background: 'rgba(220,38,38,0.08)', borderLeft: '3px solid #dc2626', padding: '10px 14px', fontSize: 12, color: '#fca5a5', marginBottom: 16 }}>{err}</div>}

        {/* Project list */}
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#71717a', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 2, textTransform: 'uppercase', fontSize: 12 }}>Loading...</div>
        ) : projects.length === 0 ? (
          <div style={{ ...S.card, padding: 60, textAlign: 'center', color: '#71717a', fontSize: 13 }}>
            No projects yet.
            {(role === 'HR' || role === 'SUPERVISOR') && (
              <div style={{ marginTop: 16 }}>
                <button style={S.btn} onClick={openCreateProject}><Plus size={12} />Create First Project</button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {projects.map((p: any) => {
              const isExpanded  = expandedProject === p.id;
              const assignments = projectAssignments[p.id] || [];
              return (
                <div key={p.id} style={{ ...S.card, borderRadius: 8, overflow: 'hidden' }}>
                  {/* Project row */}
                  <div
                    className="proj-row"
                    style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', background: '#0d0d0d' }}
                    onClick={() => toggleExpand(p.id)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>{p.name}</div>
                        <StatusBadge s={p.status} />
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {p.supervisor_name && (
                          <span style={{ fontSize: 13, color: '#71717a', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Users size={10} />Supervisor: <span style={{ color: '#a78bfa' }}>{p.supervisor_name}</span>
                          </span>
                        )}
                        {p.location && (
                          <span style={{ fontSize: 13, color: '#d4d4d8', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={10} />{p.location}
                          </span>
                        )}
                        <span style={{ fontSize: 13, color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={12} />
                          {p.start_date}{p.end_date ? ` → ${p.end_date}` : ''}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      {(role === 'HR' || role === 'SUPERVISOR') && (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); openAssign(p.id); }}
                            style={{ ...S.btnGhost, fontSize: 12, padding: '6px 12px' }}
                          >
                            <Plus size={10} />Assign Contractor
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); openEditProject(p); }}
                            style={{ ...S.btnGhost, fontSize: 12, padding: '6px 12px' }}
                          >
                            Edit
                          </button>
                        </>
                      )}
                      {isExpanded ? <ChevronUp size={14} color="#52525b" /> : <ChevronDown size={14} color="#52525b" />}
                    </div>
                  </div>

                  {/* Expanded: contractor assignments */}
                  {isExpanded && (
                    <div style={{ padding: '0 20px 20px', borderTop: '1px solid #111' }}>
                      <div style={{ paddingTop: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 20, height: 1, background: '#dc2626' }} />
                        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: '#d4d4d8', fontFamily: "'Barlow Condensed',sans-serif" }}>
                          Contractor Assignments ({assignments.length})
                        </span>
                      </div>

                      {assignments.length === 0 ? (
                        <div style={{ padding: '16px 0', color: '#71717a', fontSize: 12 }}>No contractors assigned yet.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {assignments.map((a: any) => {
                            const payStatus = a.payroll_status || 'PENDING';
                            const pc        = PAY_COLOR[payStatus] || '#71717a';
                            return (
                              <div key={a.id} style={{ background: '#111', border: `1px solid #1a1a1a`, borderLeft: `3px solid ${pc}`, borderRadius: 6, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600, fontSize: 13, color: 'white', marginBottom: 2 }}>{a.contractor_name}</div>
                                  {a.contractor_company && <div style={{ fontSize: 13, color: '#a1a1aa' }}>{a.contractor_company}</div>}
                                  {a.notes && <div style={{ fontSize: 13, color: '#71717a', marginTop: 2 }}>{a.notes}</div>}
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 900, color: '#facc15', lineHeight: 1 }}>
                                    ₹{Number(a.contract_amount).toLocaleString('en-IN')}
                                  </div>
                                  <div style={{ fontSize: 13, color: '#a1a1aa', marginTop: 2 }}>contract amount</div>
                                </div>
                                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                  <span style={{ fontSize: 13, color: pc, background: `${pc}15`, padding: '3px 10px', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
                                    {payStatus}
                                  </span>
                                  {payStatus === 'PENDING' && (role === 'SUPERVISOR' || role === 'HR') && a.payroll_id && (
                                    <button
                                      onClick={() => approvePayout(a.payroll_id, p.id)}
                                      style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80', padding: '4px 10px', fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', fontFamily: "'Barlow Condensed',sans-serif" }}
                                    >
                                      <CheckCircle size={9} />Approve & Pay
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {p.description && (
                        <div style={{ marginTop: 12, fontSize: 12, color: '#a1a1aa', borderTop: '1px solid #111', paddingTop: 12 }}>
                          {p.description}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Project Modal */}
      {showProjectModal && (
        <Modal title={editProject ? 'Edit Project' : 'Create Project'} onClose={() => setShowProjectModal(false)}>
          <form onSubmit={saveProject}>
            <Field label="Project Name *">
              <input className="pr-input" required style={S.input} value={pForm.name} onChange={e => setPForm({ ...pForm, name: e.target.value })} />
            </Field>

            {role === 'HR' && (
              <Field label="Supervisor">
                <select className="pr-input" style={S.select} value={pForm.supervisor} onChange={e => setPForm({ ...pForm, supervisor: e.target.value })}>
                  <option value="">— Unassigned —</option>
                  {supervisors.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.first_name} {s.last_name || s.username}</option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Location">
              <input className="pr-input" style={S.input} value={pForm.location} onChange={e => setPForm({ ...pForm, location: e.target.value })} />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Start Date *">
                <input className="pr-input" type="date" required style={S.input} value={pForm.start_date} onChange={e => setPForm({ ...pForm, start_date: e.target.value })} />
              </Field>
              <Field label="End Date">
                <input className="pr-input" type="date" style={S.input} value={pForm.end_date} onChange={e => setPForm({ ...pForm, end_date: e.target.value })} />
              </Field>
            </div>

            <Field label="Status">
              <select className="pr-input" style={S.select} value={pForm.status} onChange={e => setPForm({ ...pForm, status: e.target.value })}>
                <option value="ACTIVE">Active</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </Field>

            <Field label="Description">
              <textarea className="pr-input" rows={3} style={{ ...S.input, resize: 'vertical' }} value={pForm.description} onChange={e => setPForm({ ...pForm, description: e.target.value })} />
            </Field>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button type="submit" style={S.btn}>{editProject ? 'Save Changes' : 'Create Project'}</button>
              <button type="button" style={S.btnGhost} onClick={() => setShowProjectModal(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Assign Contractor Modal */}
      {showAssignModal && (
        <Modal title="Assign Contractor" onClose={() => setShowAssignModal(false)}>
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.15)', borderLeft: '3px solid #facc15', fontSize: 12, color: '#a16207' }}>
            <span style={{ color: '#facc15', fontWeight: 700 }}>⚡ Auto-payroll:</span>{' '}
            <span style={{ color: '#71717a' }}>A PENDING payment record is created automatically when you assign a contractor. Approve it here when you want to release payment.</span>
          </div>
          <form onSubmit={saveAssignment}>
            <Field label="Contractor *">
              <select className="pr-input" required style={S.select} value={aForm.contractor} onChange={e => setAForm({ ...aForm, contractor: e.target.value })}>
                <option value="">— Select Contractor —</option>
                {availableContractors(parseInt(assignProjectId)).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.user_detail?.first_name || ''} {c.user_detail?.last_name || c.user_detail?.username} {c.company_name ? `(${c.company_name})` : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Contract Amount (₹) *">
              <input className="pr-input" required type="number" min="0" step="0.01" style={S.input} value={aForm.contract_amount} onChange={e => setAForm({ ...aForm, contract_amount: e.target.value })} placeholder="e.g. 50000" />
            </Field>
            <Field label="Notes">
              <textarea className="pr-input" rows={2} style={{ ...S.input, resize: 'vertical' }} value={aForm.notes} onChange={e => setAForm({ ...aForm, notes: e.target.value })} />
            </Field>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button type="submit" style={S.btn}>Assign & Create Payroll</button>
              <button type="button" style={S.btnGhost} onClick={() => setShowAssignModal(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
