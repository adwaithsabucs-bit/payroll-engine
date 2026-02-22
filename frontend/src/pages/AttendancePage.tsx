// frontend/src/pages/AttendancePage.tsx — REPLACE ENTIRE FILE

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAttendance, markAttendance, updateAttendance, getAttendanceSummary } from '../api/attendance';
import { getLabourers } from '../api/workforce';
import { extractResults } from '../utils/pagination';
import { Plus, X, Check, Clock, XCircle, AlertCircle } from 'lucide-react';

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  PRESENT:  { bg: 'rgba(22,163,74,0.15)',   color: '#4ade80', label: 'Present'  },
  ABSENT:   { bg: 'rgba(220,38,38,0.15)',   color: '#f87171', label: 'Absent'   },
  HALF_DAY: { bg: 'rgba(202,138,4,0.15)',   color: '#facc15', label: 'Half Day' },
  LEAVE:    { bg: 'rgba(37,99,235,0.15)',   color: '#60a5fa', label: 'Leave'    },
};

const S = {
  page: { animation: 'pageIn 0.4s cubic-bezier(0.16,1,0.3,1)' } as React.CSSProperties,
  // header
  hdr: { display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:32, paddingBottom:24, borderBottom:'1px solid #161616', position:'relative' } as React.CSSProperties,
  hdrLine: { position:'absolute', bottom:-1, left:0, width:64, height:3, background:'#dc2626' } as React.CSSProperties,
  title: { fontFamily:"'Barlow Condensed',sans-serif", fontSize:48, fontWeight:900, color:'white', textTransform:'uppercase', letterSpacing:-1, lineHeight:1 } as React.CSSProperties,
  sub: { fontSize:11, letterSpacing:4, textTransform:'uppercase', color:'#3f3f46', marginBottom:8, fontWeight:600 } as React.CSSProperties,
  // stats row
  statsRow: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:2, marginBottom:24 } as React.CSSProperties,
  statBox: { background:'#0d0d0d', border:'1px solid #161616', padding:'20px 22px', position:'relative', overflow:'hidden', transition:'all 0.2s', cursor:'default' } as React.CSSProperties,
  statLabel: { fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:700, letterSpacing:4, textTransform:'uppercase', color:'#3f3f46', marginBottom:10 } as React.CSSProperties,
  statVal: { fontFamily:"'Barlow Condensed',sans-serif", fontSize:44, fontWeight:900, color:'white', lineHeight:1, letterSpacing:-2 } as React.CSSProperties,
  statBar: { position:'absolute', top:0, left:0, right:0, height:2, background:'#dc2626' } as React.CSSProperties,
  // grid
  grid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 } as React.CSSProperties,
  panel: { background:'#0d0d0d', border:'1px solid #161616', padding:24 } as React.CSSProperties,
  panelHead: { display:'flex', alignItems:'center', gap:12, marginBottom:20 } as React.CSSProperties,
  panelLine: { width:28, height:2, background:'#dc2626' } as React.CSSProperties,
  panelTitle: { fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:4, textTransform:'uppercase', color:'#52525b' } as React.CSSProperties,
  // table
  tableWrap: { background:'#0d0d0d', border:'1px solid #161616', overflow:'hidden' } as React.CSSProperties,
  th: { padding:'12px 18px', textAlign:'left' as const, fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, color:'#3f3f46', textTransform:'uppercase' as const, letterSpacing:3 },
  td: { padding:'13px 18px', fontSize:13, color:'#a1a1aa', borderBottom:'1px solid #111' },
  // form
  formOverlay: { position:'fixed' as const, inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:24 },
  modal: { background:'#0d0d0d', border:'1px solid #1e1e1e', borderTop:'3px solid #dc2626', width:'100%', maxWidth:520, padding:32 },
  label: { display:'block', fontSize:9, letterSpacing:4, textTransform:'uppercase' as const, color:'#3f3f46', fontWeight:600, marginBottom:8 },
  input: { width:'100%', background:'#141414', border:'1px solid #1e1e1e', borderBottom:'2px solid #222', color:'white', padding:'12px 14px', fontFamily:"'Barlow',sans-serif", fontSize:14, outline:'none', boxSizing:'border-box' as const },
  btn: { display:'inline-flex', alignItems:'center', gap:8, background:'#dc2626', color:'white', border:'none', padding:'11px 22px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, letterSpacing:3, textTransform:'uppercase' as const, cursor:'pointer', clipPath:'polygon(0 0,92% 0,100% 25%,100% 100%,8% 100%,0 75%)' },
  btnGhost: { display:'inline-flex', alignItems:'center', gap:8, background:'transparent', color:'#52525b', border:'1px solid #1e1e1e', padding:'10px 20px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:700, letterSpacing:3, textTransform:'uppercase' as const, cursor:'pointer' },
};

export default function AttendancePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [labourers, setLabourers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [isErr, setIsErr] = useState(false);
  const [form, setForm] = useState({ labourer: '', date: new Date().toISOString().slice(0,10), status: 'PRESENT', overtime_hours: '0', notes: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const attRes = await getAttendance();
      setRecords(extractResults<any>(attRes.data));
      if (user?.role !== 'LABOURER') {
        const labRes = await getLabourers();
        setLabourers(extractResults<any>(labRes.data));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await markAttendance({ ...form, overtime_hours: parseFloat(form.overtime_hours)||0 });
      setMsg('Attendance recorded successfully.'); setIsErr(false);
      setShowForm(false); fetchData();
    } catch (err: any) {
      const d = err.response?.data;
      setMsg(d ? Object.entries(d).map(([k,v])=>`${k}: ${Array.isArray(v)?v[0]:v}`).join(' | ') : 'Failed.');
      setIsErr(true);
    }
  };

  const handleApprove = async (id: number) => {
    try { await updateAttendance(id, { status: 'APPROVED' }); fetchData(); }
    catch(e) { console.error(e); }
  };

  // Stats
  const total    = records.length;
  const present  = records.filter(r => r.status === 'PRESENT').length;
  const absent   = records.filter(r => r.status === 'ABSENT').length;
  const halfday  = records.filter(r => r.status === 'HALF_DAY').length;
  const leave    = records.filter(r => r.status === 'LEAVE').length;
  const pending  = records.filter(r => r.approval_status === 'PENDING').length;
  const approved = records.filter(r => r.approval_status === 'APPROVED').length;
  const totalOT  = records.reduce((s,r) => s + parseFloat(r.overtime_hours||0), 0);

  // Bar chart data — last 7 days
  const last7 = Array.from({length:7}, (_,i) => {
    const d = new Date(); d.setDate(d.getDate() - (6-i));
    const ds = d.toISOString().slice(0,10);
    const dayRecs = records.filter(r => r.date === ds);
    return {
      day: d.toLocaleDateString('en',{weekday:'short'}),
      present: dayRecs.filter(r=>r.status==='PRESENT').length,
      absent:  dayRecs.filter(r=>r.status==='ABSENT').length,
      total:   dayRecs.length,
    };
  });
  const maxBar = Math.max(...last7.map(d=>d.total), 1);

  // Donut chart percentages
  const donutData = [
    { label:'Present', val: total ? Math.round(present/total*100) : 0, color:'#4ade80' },
    { label:'Absent',  val: total ? Math.round(absent/total*100)  : 0, color:'#f87171' },
    { label:'Half Day',val: total ? Math.round(halfday/total*100) : 0, color:'#facc15' },
    { label:'Leave',   val: total ? Math.round(leave/total*100)   : 0, color:'#60a5fa' },
  ];

  // SVG donut
  const r = 54, cx = 70, cy = 70, stroke = 18;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const segments = donutData.map(d => {
    const dash = (d.val / 100) * circ;
    const seg = { ...d, dash, offset, gap: circ - dash };
    offset += dash;
    return seg;
  });

  return (
    <>
      <style>{`
        @keyframes pageIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .att-stat:hover { background:#111!important; border-color:#1e1e1e!important; transform:translateY(-2px); }
        .att-row:hover td { background:#111; }
        .att-input:focus { border-bottom-color:#dc2626!important; background:#181818!important; }
        select option { background:#141414; color:white; }
      `}</style>

      <div style={S.page}>
        {/* Header */}
        <div style={S.hdr}>
          <div style={S.hdrLine}/>
          <div>
            <div style={S.sub}>Workforce</div>
            <div style={S.title}>Attendance</div>
          </div>
          {(user?.role==='HR'||user?.role==='SUPERVISOR') && (
            <button style={S.btn} onClick={()=>setShowForm(true)}>
              <Plus size={14}/> Mark Attendance
            </button>
          )}
        </div>

        {msg && (
          <div style={{ background: isErr?'rgba(220,38,38,0.07)':'rgba(22,163,74,0.07)', borderLeft:`3px solid ${isErr?'#dc2626':'#16a34a'}`, padding:'12px 16px', marginBottom:20, fontSize:13, color: isErr?'#fca5a5':'#4ade80' }}>
            {msg}
          </div>
        )}

        {/* Stats */}
        <div style={S.statsRow}>
          {[
            { label:'Total Records', val: total,    color:'#dc2626' },
            { label:'Present',       val: present,  color:'#4ade80' },
            { label:'Absent',        val: absent,   color:'#f87171' },
            { label:'Overtime hrs',  val: Math.round(totalOT), color:'#facc15' },
          ].map(s => (
            <div key={s.label} className="att-stat" style={{...S.statBox}}>
              <div style={{...S.statBar, background:s.color}}/>
              <div style={S.statLabel}>{s.label}</div>
              <div style={{...S.statVal, color:s.color}}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={S.grid}>
          {/* Bar chart */}
          <div style={S.panel}>
            <div style={S.panelHead}>
              <div style={S.panelLine}/>
              <div style={S.panelTitle}>7-Day Attendance</div>
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:120 }}>
              {last7.map(d => (
                <div key={d.day} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                  <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:2, height:100, justifyContent:'flex-end' }}>
                    <div style={{ width:'100%', background:'#4ade80', height: maxBar ? `${(d.present/maxBar)*90}px` : 0, transition:'height 0.5s', minHeight: d.present?2:0 }}/>
                    <div style={{ width:'100%', background:'#f87171', height: maxBar ? `${(d.absent/maxBar)*90}px` : 0, transition:'height 0.5s', minHeight: d.absent?2:0 }}/>
                  </div>
                  <div style={{ fontSize:10, color:'#3f3f46', letterSpacing:1 }}>{d.day}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:16, marginTop:12 }}>
              {[['#4ade80','Present'],['#f87171','Absent']].map(([c,l])=>(
                <div key={l} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:10, height:10, background:c }}/>
                  <span style={{ fontSize:10, color:'#52525b', letterSpacing:2, textTransform:'uppercase' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Donut chart */}
          <div style={S.panel}>
            <div style={S.panelHead}>
              <div style={S.panelLine}/>
              <div style={S.panelTitle}>Status Breakdown</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:28 }}>
              <svg width={140} height={140} viewBox="0 0 140 140">
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a1a1a" strokeWidth={stroke}/>
                {total===0 ? (
                  <circle cx={cx} cy={cy} r={r} fill="none" stroke="#222" strokeWidth={stroke}/>
                ) : segments.map((s,i) => (
                  <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                    stroke={s.color} strokeWidth={stroke}
                    strokeDasharray={`${s.dash} ${s.gap}`}
                    strokeDashoffset={-s.offset}
                    transform={`rotate(-90 ${cx} ${cy})`}
                    style={{ transition:'stroke-dasharray 0.5s' }}
                  />
                ))}
                <text x={cx} y={cy-6} textAnchor="middle" fill="white"
                  style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:22, fontWeight:900 }}>{total}</text>
                <text x={cx} y={cy+12} textAnchor="middle" fill="#3f3f46"
                  style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, letterSpacing:2 }}>TOTAL</text>
              </svg>
              <div style={{ flex:1 }}>
                {donutData.map(d => (
                  <div key={d.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid #111' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:8, height:8, background:d.color }}/>
                      <span style={{ fontSize:11, color:'#52525b', textTransform:'uppercase', letterSpacing:2, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700 }}>{d.label}</span>
                    </div>
                    <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:900, color:d.color }}>{d.val}<span style={{fontSize:11,color:'#3f3f46'}}>%</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Approval stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:2, marginBottom:24 }}>
          <div style={{ background:'rgba(22,163,74,0.06)', border:'1px solid rgba(22,163,74,0.15)', padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:4, textTransform:'uppercase', color:'#3f3f46' }}>Approved Records</span>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:32, fontWeight:900, color:'#4ade80' }}>{approved}</span>
          </div>
          <div style={{ background:'rgba(220,38,38,0.06)', border:'1px solid rgba(220,38,38,0.15)', padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:4, textTransform:'uppercase', color:'#3f3f46' }}>Pending Approval</span>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:32, fontWeight:900, color:'#f87171' }}>{pending}</span>
          </div>
        </div>

        {/* Table */}
        <div style={S.panelHead}>
          <div style={S.panelLine}/>
          <div style={S.panelTitle}>All Records</div>
        </div>
        <div style={S.tableWrap}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#0a0a0a', borderBottom:'1px solid #1a1a1a' }}>
                {['Labourer','Date','Status','OT hrs','Approval','Action'].map(h=>(
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding:40, textAlign:'center', color:'#3f3f46', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:4, textTransform:'uppercase', fontSize:12 }}>Loading...</td></tr>
              ) : records.length===0 ? (
                <tr><td colSpan={6} style={{ padding:60, textAlign:'center', color:'#27272a', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:4, textTransform:'uppercase', fontSize:14 }}>No Records Found</td></tr>
              ) : records.map(r => {
                const sc = STATUS_COLORS[r.status] || { bg:'rgba(82,82,91,0.3)', color:'#a1a1aa', label: r.status };
                return (
                  <tr key={r.id} className="att-row">
                    <td style={S.td}>{r.labourer_detail?.user_detail?.first_name || r.labourer_detail?.user_detail?.username || r.labourer}</td>
                    <td style={{...S.td, color:'white', fontWeight:600}}>{r.date}</td>
                    <td style={S.td}>
                      <span style={{ background:sc.bg, color:sc.color, padding:'3px 10px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase' }}>{sc.label}</span>
                    </td>
                    <td style={{...S.td, color:r.overtime_hours>0?'#facc15':'#3f3f46'}}>{r.overtime_hours}h</td>
                    <td style={S.td}>
                      <span style={{ background: r.approval_status==='APPROVED'?'rgba(22,163,74,0.15)':'rgba(220,38,38,0.1)', color: r.approval_status==='APPROVED'?'#4ade80':'#f87171', padding:'3px 10px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase' }}>
                        {r.approval_status}
                      </span>
                    </td>
                    <td style={S.td}>
                      {r.approval_status!=='APPROVED' && (user?.role==='HR'||user?.role==='SUPERVISOR') && (
                        <button onClick={()=>handleApprove(r.id)} style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 12px', background:'rgba(22,163,74,0.1)', color:'#4ade80', border:'1px solid rgba(22,163,74,0.2)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', cursor:'pointer' }}>
                          <Check size={11}/> Approve
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Create Modal */}
        {showForm && (
          <div style={S.formOverlay}>
            <div style={S.modal}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, paddingBottom:20, borderBottom:'1px solid #1a1a1a' }}>
                <div>
                  <div style={{ fontSize:9, letterSpacing:5, textTransform:'uppercase', color:'#dc2626', fontWeight:600, marginBottom:4 }}>Record</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, fontWeight:900, color:'white', textTransform:'uppercase', letterSpacing:-1 }}>Mark Attendance</div>
                </div>
                <button onClick={()=>setShowForm(false)} style={{ background:'#1a1a1a', border:'1px solid #222', color:'#52525b', width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                  <X size={16}/>
                </button>
              </div>
              <form onSubmit={handleCreate}>
                <div style={{ marginBottom:18 }}>
                  <label style={S.label}>Labourer</label>
                  <select className="att-input" style={S.input} value={form.labourer} onChange={e=>setForm({...form,labourer:e.target.value})} required>
                    <option value="">Select labourer</option>
                    {labourers.map(l=>(
                      <option key={l.id} value={l.id}>{l.user_detail?.first_name} {l.user_detail?.last_name||l.user_detail?.username}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:18 }}>
                  <div>
                    <label style={S.label}>Date</label>
                    <input className="att-input" style={S.input} type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required/>
                  </div>
                  <div>
                    <label style={S.label}>Status</label>
                    <select className="att-input" style={S.input} value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                      <option value="PRESENT">Present</option>
                      <option value="ABSENT">Absent</option>
                      <option value="HALF_DAY">Half Day</option>
                      <option value="LEAVE">Leave</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom:18 }}>
                  <label style={S.label}>Overtime Hours</label>
                  <input className="att-input" style={S.input} type="number" min="0" step="0.5" value={form.overtime_hours} onChange={e=>setForm({...form,overtime_hours:e.target.value})}/>
                </div>
                <div style={{ marginBottom:24 }}>
                  <label style={S.label}>Notes</label>
                  <input className="att-input" style={S.input} type="text" placeholder="Optional notes" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
                </div>
                <div style={{ display:'flex', gap:12 }}>
                  <button type="submit" style={S.btn}>Record Attendance</button>
                  <button type="button" style={S.btnGhost} onClick={()=>setShowForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
