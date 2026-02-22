// frontend/src/pages/PayrollPage.tsx — REPLACE ENTIRE FILE

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPayrolls, getPeriods, createPeriod, generatePayroll, approvePayroll } from '../api/payroll';
import { extractResults } from '../utils/pagination';
import { Plus, X, Zap, Check } from 'lucide-react';

const PAY_STATUS: Record<string, { bg: string; color: string }> = {
  PENDING:  { bg:'rgba(202,138,4,0.12)',  color:'#facc15' },
  APPROVED: { bg:'rgba(22,163,74,0.12)',  color:'#4ade80' },
  PAID:     { bg:'rgba(37,99,235,0.12)',  color:'#60a5fa' },
};

const S = {
  page: { animation:'pageIn 0.4s cubic-bezier(0.16,1,0.3,1)' } as React.CSSProperties,
  hdr: { display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:32, paddingBottom:24, borderBottom:'1px solid #161616', position:'relative' } as React.CSSProperties,
  hdrLine: { position:'absolute', bottom:-1, left:0, width:64, height:3, background:'#dc2626' } as React.CSSProperties,
  title: { fontFamily:"'Barlow Condensed',sans-serif", fontSize:48, fontWeight:900, color:'white', textTransform:'uppercase', letterSpacing:-1, lineHeight:1 } as React.CSSProperties,
  sub: { fontSize:11, letterSpacing:4, textTransform:'uppercase', color:'#3f3f46', marginBottom:8, fontWeight:600 } as React.CSSProperties,
  statsRow: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:2, marginBottom:24 } as React.CSSProperties,
  statBox: { background:'#0d0d0d', border:'1px solid #161616', padding:'22px 24px', position:'relative', overflow:'hidden', transition:'all 0.2s' } as React.CSSProperties,
  statLabel: { fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:700, letterSpacing:4, textTransform:'uppercase', color:'#3f3f46', marginBottom:10 } as React.CSSProperties,
  statVal: { fontFamily:"'Barlow Condensed',sans-serif", fontSize:36, fontWeight:900, color:'white', lineHeight:1, letterSpacing:-2 } as React.CSSProperties,
  statBar: { position:'absolute', top:0, left:0, right:0, height:2 } as React.CSSProperties,
  grid2: { display:'grid', gridTemplateColumns:'300px 1fr', gap:16, marginBottom:24 } as React.CSSProperties,
  panel: { background:'#0d0d0d', border:'1px solid #161616', padding:24 } as React.CSSProperties,
  panelHead: { display:'flex', alignItems:'center', gap:12, marginBottom:20 } as React.CSSProperties,
  panelLine: { width:28, height:2, background:'#dc2626' } as React.CSSProperties,
  panelTitle: { fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:4, textTransform:'uppercase', color:'#52525b' } as React.CSSProperties,
  tableWrap: { background:'#0d0d0d', border:'1px solid #161616', overflow:'hidden' } as React.CSSProperties,
  th: { padding:'12px 18px', textAlign:'left' as const, fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, color:'#3f3f46', textTransform:'uppercase' as const, letterSpacing:3 },
  td: { padding:'13px 18px', fontSize:13, color:'#a1a1aa', borderBottom:'1px solid #111' },
  btn: { display:'inline-flex', alignItems:'center', gap:8, background:'#dc2626', color:'white', border:'none', padding:'11px 22px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, letterSpacing:3, textTransform:'uppercase' as const, cursor:'pointer', clipPath:'polygon(0 0,92% 0,100% 25%,100% 100%,8% 100%,0 75%)' },
  btnSm: { display:'inline-flex', alignItems:'center', gap:4, padding:'5px 12px', background:'rgba(220,38,38,0.1)', color:'#f87171', border:'1px solid rgba(220,38,38,0.2)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase' as const, cursor:'pointer' },
  btnGhost: { display:'inline-flex', alignItems:'center', gap:8, background:'transparent', color:'#52525b', border:'1px solid #1e1e1e', padding:'10px 20px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:700, letterSpacing:3, textTransform:'uppercase' as const, cursor:'pointer' },
  input: { width:'100%', background:'#141414', border:'1px solid #1e1e1e', borderBottom:'2px solid #222', color:'white', padding:'12px 14px', fontFamily:"'Barlow',sans-serif", fontSize:14, outline:'none', boxSizing:'border-box' as const },
  label: { display:'block', fontSize:9, letterSpacing:4, textTransform:'uppercase' as const, color:'#3f3f46', fontWeight:600, marginBottom:8 },
  modal: { background:'#0d0d0d', border:'1px solid #1e1e1e', borderTop:'3px solid #dc2626', width:'100%', maxWidth:480, padding:32 } as React.CSSProperties,
  overlay: { position:'fixed' as const, inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:24 },
};

export default function PayrollPage() {
  const { user } = useAuth();
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [selPeriod, setSelPeriod] = useState('');
  const [loading, setLoading] = useState(true);
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [isErr, setIsErr] = useState(false);
  const [periodForm, setPeriodForm] = useState({ name:'', start_date:'', end_date:'' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = selPeriod ? { period: selPeriod } : {};
      const payRes = await getPayrolls(params);
      setPayrolls(extractResults<any>(payRes.data));
      if (user?.role==='HR') {
        const perRes = await getPeriods();
        setPeriods(extractResults<any>(perRes.data));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [selPeriod]);

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPeriod(periodForm);
      setMsg('Period created.'); setIsErr(false);
      setShowPeriodForm(false); setPeriodForm({ name:'', start_date:'', end_date:'' });
      fetchData();
    } catch (err: any) {
      const d = err.response?.data;
      setMsg(d ? Object.entries(d).map(([k,v])=>`${k}: ${Array.isArray(v)?v[0]:v}`).join(' | '):'Failed.');
      setIsErr(true);
    }
  };

  const handleGenerate = async (periodId: number) => {
    try {
      await generatePayroll(periodId);
      setMsg('Payroll generated successfully.'); setIsErr(false);
      fetchData();
    } catch (err: any) {
      setMsg(err.response?.data?.error||'Failed to generate.'); setIsErr(true);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await approvePayroll(id, { payment_status:'APPROVED' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  // Stats
  const total    = payrolls.length;
  const pending  = payrolls.filter(p=>p.payment_status==='PENDING').length;
  const approved = payrolls.filter(p=>p.payment_status==='APPROVED').length;
  const paid     = payrolls.filter(p=>p.payment_status==='PAID').length;
  const totalWages = payrolls.reduce((s,p)=>s+parseFloat(p.total_salary||0),0);
  const totalDays  = payrolls.reduce((s,p)=>s+parseInt(p.days_present||0),0);

  // Wage distribution bars
  const wageGroups = [
    { label:'0–300', count: payrolls.filter(p=>parseFloat(p.total_salary||0)<300).length },
    { label:'300–600', count: payrolls.filter(p=>{ const v=parseFloat(p.total_salary||0); return v>=300&&v<600; }).length },
    { label:'600–1000', count: payrolls.filter(p=>{ const v=parseFloat(p.total_salary||0); return v>=600&&v<1000; }).length },
    { label:'1000+', count: payrolls.filter(p=>parseFloat(p.total_salary||0)>=1000).length },
  ];
  const maxWg = Math.max(...wageGroups.map(g=>g.count), 1);

  // Status donut
  const r=50, cx=65, cy=65, stroke=16, circ=2*Math.PI*r;
  const donut = [
    { label:'Pending',  val:total?pending/total:0,  color:'#facc15' },
    { label:'Approved', val:total?approved/total:0, color:'#4ade80' },
    { label:'Paid',     val:total?paid/total:0,     color:'#60a5fa' },
  ];
  let dOffset=0;
  const segs = donut.map(d => {
    const dash=(d.val)*circ;
    const seg={ ...d, dash, offset:dOffset, gap:circ-dash };
    dOffset+=dash; return seg;
  });

  return (
    <>
      <style>{`
        @keyframes pageIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .pay-stat:hover{background:#111!important;transform:translateY(-2px);}
        .pay-row:hover td{background:#111;}
        .pay-input:focus{border-bottom-color:#dc2626!important;background:#181818!important;}
        select option{background:#141414;color:white;}
        .period-item{padding:12px 16px;border-bottom:1px solid #111;cursor:pointer;transition:background 0.15s;}
        .period-item:hover{background:#111;}
        .period-item.active{background:rgba(220,38,38,0.06);border-left:2px solid #dc2626;}
      `}</style>

      <div style={S.page}>
        {/* Header */}
        <div style={S.hdr}>
          <div style={S.hdrLine}/>
          <div>
            <div style={S.sub}>Finance</div>
            <div style={S.title}>Payroll</div>
          </div>
          {user?.role==='HR' && (
            <button style={S.btn} onClick={()=>setShowPeriodForm(true)}>
              <Plus size={14}/> New Period
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
            { label:'Total Records', val: total,                         color:'#dc2626' },
            { label:'Pending',       val: pending,                        color:'#facc15' },
            { label:'Approved',      val: approved,                       color:'#4ade80' },
            { label:'Total Wages',   val:`₹${Math.round(totalWages).toLocaleString('en-IN')}`, color:'#60a5fa' },
          ].map(s => (
            <div key={s.label} className="pay-stat" style={S.statBox}>
              <div style={{...S.statBar, background:s.color}}/>
              <div style={S.statLabel}>{s.label}</div>
              <div style={{...S.statVal, color:s.color, fontSize:typeof s.val==='string'?24:44}}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Main grid: periods sidebar + charts */}
        <div style={S.grid2}>
          {/* Periods list */}
          {user?.role==='HR' && (
            <div style={S.panel}>
              <div style={S.panelHead}>
                <div style={S.panelLine}/>
                <div style={S.panelTitle}>Periods</div>
              </div>
              <div style={{ marginBottom:12 }}>
                <button
                  className={`period-item${selPeriod===''?' active':''}`}
                  style={{ display:'block', width:'100%', textAlign:'left', background:'transparent', border:'none', borderBottom:'1px solid #111', padding:'12px 16px', cursor:'pointer', fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, letterSpacing:2, textTransform:'uppercase', color: selPeriod===''?'white':'#52525b', borderLeft: selPeriod===''?'2px solid #dc2626':'2px solid transparent', transition:'all 0.15s' }}
                  onClick={()=>setSelPeriod('')}
                >All Periods</button>
                {periods.map(p => (
                  <div key={p.id}
                    className={`period-item${selPeriod===String(p.id)?' active':''}`}
                    style={{ borderLeft: selPeriod===String(p.id)?'2px solid #dc2626':'2px solid transparent', background:'transparent' }}
                    onClick={()=>setSelPeriod(String(p.id))}
                  >
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, color: selPeriod===String(p.id)?'white':'#71717a', letterSpacing:1, textTransform:'uppercase', marginBottom:3 }}>{p.name}</div>
                    <div style={{ fontSize:10, color:'#3f3f46', letterSpacing:1 }}>{p.start_date} → {p.end_date}</div>
                    <div style={{ display:'flex', gap:8, marginTop:8 }}>
                      <button style={{...S.btnSm, background:'rgba(37,99,235,0.1)', color:'#60a5fa', border:'1px solid rgba(37,99,235,0.2)'}}
                        onClick={e=>{e.stopPropagation();handleGenerate(p.id);}}>
                        <Zap size={10}/> Generate
                      </button>
                    </div>
                  </div>
                ))}
                {periods.length===0 && <div style={{ color:'#27272a', fontSize:11, letterSpacing:2, textTransform:'uppercase', fontFamily:"'Barlow Condensed',sans-serif", padding:'12px 16px' }}>No periods yet</div>}
              </div>
            </div>
          )}

          {/* Charts */}
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
              {/* Status donut */}
              <div style={S.panel}>
                <div style={S.panelHead}>
                  <div style={S.panelLine}/>
                  <div style={S.panelTitle}>Payment Status</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:20 }}>
                  <svg width={130} height={130} viewBox="0 0 130 130">
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a1a1a" strokeWidth={stroke}/>
                    {total===0 ? <circle cx={cx} cy={cy} r={r} fill="none" stroke="#222" strokeWidth={stroke}/> :
                      segs.map((s,i)=>(
                        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                          stroke={s.color} strokeWidth={stroke}
                          strokeDasharray={`${s.dash} ${s.gap}`}
                          strokeDashoffset={-s.offset}
                          transform={`rotate(-90 ${cx} ${cy})`}/>
                      ))
                    }
                    <text x={cx} y={cy-4} textAnchor="middle" fill="white"
                      style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:900 }}>{total}</text>
                    <text x={cx} y={cy+12} textAnchor="middle" fill="#3f3f46"
                      style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:8, letterSpacing:2 }}>TOTAL</text>
                  </svg>
                  <div style={{ flex:1 }}>
                    {donut.map(d=>(
                      <div key={d.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid #111' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ width:7, height:7, background:d.color }}/>
                          <span style={{ fontSize:10, color:'#52525b', textTransform:'uppercase', letterSpacing:2, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700 }}>{d.label}</span>
                        </div>
                        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:900, color:d.color }}>
                          {Math.round(d.val*100)}<span style={{fontSize:9,color:'#3f3f46'}}>%</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Wage distribution */}
              <div style={S.panel}>
                <div style={S.panelHead}>
                  <div style={S.panelLine}/>
                  <div style={S.panelTitle}>Wage Distribution</div>
                </div>
                {wageGroups.map(g=>(
                  <div key={g.label} style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'#52525b' }}>₹{g.label}</span>
                      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:900, color:'white' }}>{g.count}</span>
                    </div>
                    <div style={{ height:4, background:'#1a1a1a', overflow:'hidden' }}>
                      <div style={{ height:'100%', background:'#dc2626', width:`${(g.count/maxWg)*100}%`, transition:'width 0.5s' }}/>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop:16, paddingTop:12, borderTop:'1px solid #111', fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:'#52525b', letterSpacing:2, textTransform:'uppercase' }}>
                  Total days worked: <span style={{ color:'white', fontWeight:900 }}>{totalDays}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payroll table */}
        <div style={S.panelHead}>
          <div style={S.panelLine}/>
          <div style={S.panelTitle}>Payroll Records</div>
        </div>
        <div style={S.tableWrap}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#0a0a0a', borderBottom:'1px solid #1a1a1a' }}>
                {['Labourer','Period','Days','OT hrs','Wage/Day','Total','Status','Action'].map(h=>(
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding:40, textAlign:'center', color:'#3f3f46', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:4, textTransform:'uppercase', fontSize:12 }}>Loading...</td></tr>
              ) : payrolls.length===0 ? (
                <tr><td colSpan={8} style={{ padding:60, textAlign:'center', color:'#27272a', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:4, textTransform:'uppercase', fontSize:14 }}>No Payroll Records</td></tr>
              ) : payrolls.map(p => {
                const sc = PAY_STATUS[p.payment_status]||{ bg:'rgba(82,82,91,0.2)', color:'#a1a1aa' };
                return (
                  <tr key={p.id} className="pay-row">
                    <td style={{...S.td, color:'white', fontWeight:600}}>{p.labourer_detail?.user_detail?.first_name||p.labourer}</td>
                    <td style={S.td}>{p.period_detail?.name||p.period}</td>
                    <td style={{...S.td, color:'#60a5fa', fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:900}}>{p.days_present}</td>
                    <td style={{...S.td, color:p.overtime_hours>0?'#facc15':'#3f3f46'}}>{p.overtime_hours}h</td>
                    <td style={S.td}>₹{p.daily_wage_snapshot}</td>
                    <td style={{...S.td, color:'#4ade80', fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:900}}>₹{parseFloat(p.total_salary||0).toLocaleString('en-IN')}</td>
                    <td style={S.td}>
                      <span style={{ background:sc.bg, color:sc.color, padding:'3px 10px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase' }}>
                        {p.payment_status}
                      </span>
                    </td>
                    <td style={S.td}>
                      {p.payment_status==='PENDING' && user?.role==='HR' && (
                        <button onClick={()=>handleApprove(p.id)} style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 12px', background:'rgba(22,163,74,0.1)', color:'#4ade80', border:'1px solid rgba(22,163,74,0.2)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', cursor:'pointer' }}>
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

        {/* Create Period Modal */}
        {showPeriodForm && (
          <div style={S.overlay}>
            <div style={S.modal}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, paddingBottom:20, borderBottom:'1px solid #1a1a1a' }}>
                <div>
                  <div style={{ fontSize:9, letterSpacing:5, textTransform:'uppercase', color:'#dc2626', fontWeight:600, marginBottom:4 }}>Finance</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, fontWeight:900, color:'white', textTransform:'uppercase', letterSpacing:-1 }}>New Pay Period</div>
                </div>
                <button onClick={()=>setShowPeriodForm(false)} style={{ background:'#1a1a1a', border:'1px solid #222', color:'#52525b', width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                  <X size={16}/>
                </button>
              </div>
              <form onSubmit={handleCreatePeriod}>
                <div style={{ marginBottom:18 }}>
                  <label style={S.label}>Period Name</label>
                  <input className="pay-input" style={S.input} placeholder="e.g. February 2025" value={periodForm.name} onChange={e=>setPeriodForm({...periodForm,name:e.target.value})} required/>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
                  <div>
                    <label style={S.label}>Start Date</label>
                    <input className="pay-input" style={S.input} type="date" value={periodForm.start_date} onChange={e=>setPeriodForm({...periodForm,start_date:e.target.value})} required/>
                  </div>
                  <div>
                    <label style={S.label}>End Date</label>
                    <input className="pay-input" style={S.input} type="date" value={periodForm.end_date} onChange={e=>setPeriodForm({...periodForm,end_date:e.target.value})} required/>
                  </div>
                </div>
                <div style={{ display:'flex', gap:12 }}>
                  <button type="submit" style={S.btn}>Create Period</button>
                  <button type="button" style={S.btnGhost} onClick={()=>setShowPeriodForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
