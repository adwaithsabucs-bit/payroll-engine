import React, { useEffect, useState } from 'react';
import { getLabourers, getContractors } from '../api/workforce';
import { Labourer, Contractor } from '../types';
import { useAuth } from '../context/AuthContext';
import { Users, Building } from 'lucide-react';
import { extractResults } from '../utils/pagination';
const WorkforcePage = () => {
  const { user } = useAuth();
  const [labourers, setLabourers] = useState<Labourer[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [tab, setTab] = useState<'labourers' | 'contractors'>('labourers');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const labRes = await getLabourers();
        setLabourers(extractResults<Labourer>(labRes.data));

        if (user?.role !== 'CONTRACTOR') {
          const conRes = await getContractors();
          setContractors(extractResults<Contractor>(conRes.data));
        }
      } catch (err) {
        console.error('Failed to fetch workforce data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [user?.role]);

  if (loading) return <div style={{ padding: 40, color: '#64748b' }}>Loading workforce...</div>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Workforce</h1>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 28 }}>Manage contractors and labourers</p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 4, width: 'fit-content', marginBottom: 28 }}>
        {[
          { key: 'labourers', label: `Labourers (${labourers.length})`, icon: Users },
          { key: 'contractors', label: `Contractors (${contractors.length})`, icon: Building },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 18px',
              background: tab === key ? 'white' : 'transparent',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: tab === key ? 600 : 400,
              color: tab === key ? '#1e293b' : '#64748b',
              cursor: 'pointer',
              boxShadow: tab === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Labourers Table */}
      {tab === 'labourers' && (
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Name', 'Contractor', 'Skill', 'Daily Wage', 'OT Rate', 'Status'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labourers.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No labourers found</td></tr>
              ) : labourers.map((l, i) => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 500, color: '#1e293b', fontSize: 14 }}>{l.full_name || l.username}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>@{l.username}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#374151' }}>{l.contractor_name || '-'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#374151' }}>{l.skill || '-'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#1e293b' }}>₹{parseFloat(l.daily_wage).toFixed(2)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#374151' }}>₹{parseFloat(l.overtime_rate).toFixed(2)}/hr</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      background: l.is_active ? '#d1fae5' : '#fee2e2',
                      color: l.is_active ? '#065f46' : '#991b1b',
                      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    }}>
                      {l.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Contractors Table */}
      {tab === 'contractors' && (
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Name', 'Company', 'Supervisor', 'Labourers', 'Status'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contractors.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No contractors found</td></tr>
              ) : contractors.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1e293b', fontSize: 14 }}>
                    {c.user_detail?.first_name} {c.user_detail?.last_name || c.user_detail?.username}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#374151' }}>{c.company_name || '-'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#374151' }}>
                    {c.supervisor_detail?.first_name} {c.supervisor_detail?.last_name || c.supervisor_detail?.username}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>{c.labourer_count}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      background: c.is_active ? '#d1fae5' : '#fee2e2',
                      color: c.is_active ? '#065f46' : '#991b1b',
                      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    }}>
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
  );
};

export default WorkforcePage;