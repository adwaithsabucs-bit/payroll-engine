// frontend/src/pages/LoginPage.tsx — REPLACE ENTIRE FILE

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Step = 'credentials' | 'pin';

// ── 4-digit PIN input component ──────────────────────────────────

interface PINBoxesProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}
const PINBoxes = ({ label, value, onChange, autoFocus }: PINBoxesProps) => {
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null),
                useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    if (autoFocus) refs[0].current?.focus();
  }, [autoFocus]);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (value[i]) {
        // clear this box
        const arr = value.split('');
        arr[i] = '';
        onChange(arr.join(''));
      } else if (i > 0) {
        // move to previous
        refs[i - 1].current?.focus();
        const arr = value.split('');
        arr[i - 1] = '';
        onChange(arr.join(''));
      }
      e.preventDefault();
    }
  };

  const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const ch = e.target.value.replace(/\D/g, '').slice(-1);
    if (!ch) return;
    const arr = (value + '    ').slice(0, 4).split('');
    arr[i] = ch;
    const next = arr.join('').replace(/ /g, '');
    onChange(arr.join(''));
    if (i < 3) refs[i + 1].current?.focus();
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <label style={{ display: 'block', fontSize: 9, letterSpacing: 4, textTransform: 'uppercase' as const, color: '#3f3f46', fontWeight: 600, marginBottom: 14 }}>{label}</label>
      <div style={{ display: 'flex', gap: 12 }}>
        {[0, 1, 2, 3].map(i => {
          const filled = !!(value[i] && value[i].trim());
          return (
            <input
              key={i}
              ref={refs[i]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={''}
              onKeyDown={e => handleKey(i, e)}
              onChange={e => handleChange(i, e)}
              style={{
                width: 56, height: 64,
                background: filled ? '#1a1a1a' : '#141414',
                border: `1px solid ${filled ? '#dc2626' : '#1e1e1e'}`,
                borderBottom: `2px solid ${filled ? '#dc2626' : '#222'}`,
                color: 'white', textAlign: 'center', fontSize: filled ? 28 : 14,
                outline: 'none', transition: 'all 0.15s',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 900, letterSpacing: 0,
              }}
              placeholder={filled ? '' : '—'}
            />
          );
        })}
        {/* Show filled dots overlay - just visual indicator */}
      </div>
      {/* Dots representation */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ width: 56, display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: value[i]?.trim() ? 8 : 4,
              height: value[i]?.trim() ? 8 : 4,
              borderRadius: '50%',
              background: value[i]?.trim() ? '#dc2626' : '#2a2a2a',
              transition: 'all 0.15s',
              marginTop: value[i]?.trim() ? 0 : 2,
            }} />
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main Page ────────────────────────────────────────────────────

const LoginPage = () => {
  const { loginStep1, loginStep2 } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]                   = useState<Step>('credentials');
  const [form, setForm]                   = useState({ username: '', password: '' });
  const [preAuthToken, setPreAuthToken]   = useState('');
  const [pinIsSet, setPinIsSet]           = useState(false);
  const [displayName, setDisplayName]     = useState('');

  // PIN inputs (4 digits each)
  const [pin, setPin]           = useState('');
  const [newPin, setNewPin]     = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  // ── Step 1: credentials ────────────────────────────
  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await loginStep1(form.username, form.password);
      setPreAuthToken(data.pre_auth_token);
      setPinIsSet(data.pin_is_set);
      setDisplayName(data.username);
      setStep('pin');
    } catch (err: any) {
      setError(
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        Object.values(err.response?.data || {})[0] as string ||
        'Invalid credentials. Try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: PIN verify / set ───────────────────────
  const handlePIN = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (pinIsSet) {
      if (pin.replace(/\s/g, '').length !== 4) { setError('Enter all 4 digits.'); return; }
    } else {
      if (newPin.replace(/\s/g, '').length !== 4)  { setError('Set all 4 digits for your new PIN.'); return; }
      if (confirmPin.replace(/\s/g, '').length !== 4) { setError('Confirm all 4 digits.'); return; }
      if (newPin !== confirmPin) { setError('PINs do not match.'); return; }
    }

    setLoading(true);
    try {
      if (pinIsSet) {
        await loginStep2(preAuthToken, { pin: pin.replace(/\s/g, '') });
      } else {
        await loginStep2(preAuthToken, {
          new_pin:     newPin.replace(/\s/g, ''),
          confirm_pin: confirmPin.replace(/\s/g, ''),
        });
      }
      navigate('/dashboard');
    } catch (err: any) {
      const d = err.response?.data;
      if (d) {
        setError(
          d.pin?.[0] || d.new_pin?.[0] || d.confirm_pin?.[0] ||
          d.non_field_errors?.[0] || d.detail || 'Incorrect PIN. Try again.'
        );
      } else {
        setError('Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setStep('credentials');
    setPin(''); setNewPin(''); setConfirmPin('');
    setError(''); setPreAuthToken('');
  };

  return (
    <>
      <style>{`
        .lp-root {
          min-height: 100vh;
          background: #080808;
          display: flex;
          font-family: 'Barlow', sans-serif;
          overflow: hidden;
          position: relative;
        }
        .lp-root::before {
          content: '';
          position: absolute; inset: 0;
          background-image: radial-gradient(circle, rgba(220,38,38,0.07) 1px, transparent 1px);
          background-size: 40px 40px;
          animation: bgDrift 25s linear infinite;
          pointer-events: none;
        }
        @keyframes bgDrift {
          0%   { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }

        .lp-left {
          flex: 1;
          display: flex; flex-direction: column;
          justify-content: space-between;
          padding: 56px 64px;
          position: relative; overflow: hidden;
          opacity: 0; transform: translateX(-30px);
          transition: opacity 0.9s cubic-bezier(0.16,1,0.3,1),
                      transform 0.9s cubic-bezier(0.16,1,0.3,1);
        }
        .lp-left.in { opacity: 1; transform: translateX(0); }
        .lp-left::after {
          content: '';
          position: absolute; top: 0; right: 0;
          width: 2px; height: 100%;
          background: linear-gradient(to bottom, transparent, #dc2626 30%, #dc2626 70%, transparent);
        }

        .lp-ghost {
          position: absolute; bottom: -60px; left: -30px;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 260px; font-weight: 900;
          color: rgba(255,255,255,0.018);
          line-height: 1; letter-spacing: -16px;
          pointer-events: none; user-select: none;
        }

        .lp-logo { display: flex; align-items: center; gap: 14px; position: relative; z-index: 1; }
        .lp-logo-mark {
          width: 46px; height: 46px; background: #dc2626;
          display: flex; align-items: center; justify-content: center;
          clip-path: polygon(0 0, 82% 0, 100% 18%, 100% 100%, 18% 100%, 0 82%);
        }
        .lp-logo-name {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 20px; font-weight: 800; color: white;
          letter-spacing: 3px; text-transform: uppercase;
        }
        .lp-logo-sub { font-size: 9px; color: #3f3f46; letter-spacing: 4px; text-transform: uppercase; margin-top: 2px; }

        .lp-hero { position: relative; z-index: 1; }
        .lp-tag { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
        .lp-tag-line { width: 36px; height: 2px; background: #dc2626; }
        .lp-tag-text { font-size: 10px; letter-spacing: 5px; text-transform: uppercase; color: #dc2626; font-weight: 600; }

        .lp-h1 {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 80px; font-weight: 900;
          line-height: 0.88; color: white;
          text-transform: uppercase; letter-spacing: -3px;
        }
        .lp-h1 em { font-style: normal; color: #dc2626; display: block; }
        .lp-desc { margin-top: 24px; font-size: 14px; color: #52525b; line-height: 1.7; max-width: 340px; font-weight: 300; }

        .lp-stats { display: flex; gap: 48px; position: relative; z-index: 1; }
        .lp-stat-n { font-family: 'Barlow Condensed', sans-serif; font-size: 40px; font-weight: 900; color: white; line-height: 1; }
        .lp-stat-n em { font-style: normal; color: #dc2626; }
        .lp-stat-l { font-size: 10px; color: #3f3f46; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px; }

        .lp-right {
          width: 480px; background: #0d0d0d;
          display: flex; align-items: center; justify-content: center;
          padding: 64px 56px; position: relative;
          border-left: 1px solid #1a1a1a;
          opacity: 0; transform: translateX(30px);
          transition: opacity 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s,
                      transform 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s;
        }
        .lp-right.in { opacity: 1; transform: translateX(0); }
        .lp-right::before {
          content: ''; position: absolute;
          top: 0; left: 56px; right: 56px; height: 3px; background: #dc2626;
        }

        .lp-form { width: 100%; }
        .lp-form-eye { font-size: 9px; letter-spacing: 5px; text-transform: uppercase; color: #dc2626; font-weight: 600; margin-bottom: 6px; }
        .lp-form-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 44px; font-weight: 900; color: white;
          text-transform: uppercase; letter-spacing: -1px; line-height: 1; margin-bottom: 44px;
        }

        .lp-field { margin-bottom: 24px; }
        .lp-label { display: block; font-size: 9px; letter-spacing: 4px; text-transform: uppercase; color: #3f3f46; font-weight: 600; margin-bottom: 10px; transition: color 0.2s; }
        .lp-field:focus-within .lp-label { color: #dc2626; }

        .lp-input {
          width: 100%; background: #141414;
          border: 1px solid #1e1e1e; border-bottom: 2px solid #222;
          color: white; padding: 15px 16px;
          font-family: 'Barlow', sans-serif; font-size: 15px; outline: none; transition: all 0.2s;
          box-sizing: border-box;
        }
        .lp-input:focus { border-bottom-color: #dc2626; background: #181818; }
        .lp-input::placeholder { color: #2a2a2a; font-size: 13px; }

        .lp-error { background: rgba(220,38,38,0.07); border-left: 3px solid #dc2626; padding: 12px 16px; font-size: 13px; color: #fca5a5; margin-bottom: 24px; }

        .lp-btn {
          width: 100%; background: #dc2626; color: white; border: none; padding: 17px;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 15px; font-weight: 700; letter-spacing: 5px; text-transform: uppercase;
          cursor: pointer; position: relative; overflow: hidden; transition: all 0.25s;
          clip-path: polygon(0 0, 93% 0, 100% 28%, 100% 100%, 7% 100%, 0 72%);
        }
        .lp-btn::before {
          content: ''; position: absolute; inset: 0;
          background: rgba(255,255,255,0.08); transform: translateX(-100%); transition: transform 0.3s;
        }
        .lp-btn:hover::before { transform: translateX(0); }
        .lp-btn:hover { background: #b91c1c; }
        .lp-btn:disabled { background: #27272a; cursor: not-allowed; clip-path: none; }

        .lp-back {
          width: 100%; background: transparent; color: #52525b; border: 1px solid #1e1e1e;
          padding: 12px; margin-top: 12px;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 12px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase;
          cursor: pointer; transition: all 0.2s;
        }
        .lp-back:hover { border-color: #dc2626; color: #dc2626; }

        .lp-user-chip {
          display: inline-flex; align-items: center; gap: 8px;
          background: #141414; border: 1px solid #1e1e1e;
          padding: 8px 14px; margin-bottom: 28px;
        }
        .lp-user-dot { width: 7px; height: 7px; background: #4ade80; border-radius: 50%; }

        .lp-footer { margin-top: 36px; padding-top: 24px; border-top: 1px solid #1a1a1a; display: flex; align-items: center; gap: 10px; }
        .lp-diamond { width: 7px; height: 7px; background: #dc2626; clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%); flex-shrink: 0; }
        .lp-footer p { font-size: 10px; color: #27272a; letter-spacing: 1px; line-height: 1.6; }

        .lp-spinner { display: inline-block; width: 13px; height: 13px; border: 2px solid rgba(255,255,255,0.2); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; margin-right: 8px; vertical-align: middle; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .lp-pin-box:focus { border-bottom-color: #dc2626 !important; background: #1e1e1e !important; }

        @media (max-width: 860px) { .lp-left { display: none; } .lp-right { width: 100%; } }
      `}</style>

      <div className="lp-root">
        {/* ── Left panel ── */}
        <div className={`lp-left ${mounted ? 'in' : ''}`}>
          <div className="lp-ghost">PE</div>
          <div className="lp-logo">
            <div className="lp-logo-mark">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M11 2L20 19H2L11 2Z" fill="white"/>
                <path d="M7 14H15" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="square"/>
              </svg>
            </div>
            <div>
              <div className="lp-logo-name">PayrollEngine</div>
              <div className="lp-logo-sub">Construction Wages</div>
            </div>
          </div>

          <div className="lp-hero">
            <div className="lp-tag">
              <div className="lp-tag-line" />
              <span className="lp-tag-text">Workforce Management System</span>
            </div>
            <h1 className="lp-h1">
              Built for<br />
              <em>the field,</em>
              not the<br />office
            </h1>
            <p className="lp-desc">
              Track attendance, manage contractors and labourers,
              process wages — all in one industrial-grade platform
              built for construction teams.
            </p>
          </div>

          <div className="lp-stats">
            <div>
              <div className="lp-stat-n">4<em>×</em></div>
              <div className="lp-stat-l">User Roles</div>
            </div>
            <div>
              <div className="lp-stat-n">2<em>FA</em></div>
              <div className="lp-stat-l">PIN Security</div>
            </div>
            <div>
              <div className="lp-stat-n">0<em>₹</em></div>
              <div className="lp-stat-l">Errors</div>
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className={`lp-right ${mounted ? 'in' : ''}`}>
          <div className="lp-form">

            {/* ── Step 1: Credentials ── */}
            {step === 'credentials' && (
              <>
                <div className="lp-form-eye">Secure Access Portal</div>
                <div className="lp-form-title">Sign In</div>
                <form onSubmit={handleCredentials}>
                  <div className="lp-field">
                    <label className="lp-label">Username</label>
                    <input className="lp-input" type="text" placeholder="your username"
                      value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required autoFocus />
                  </div>
                  <div className="lp-field">
                    <label className="lp-label">Password</label>
                    <input className="lp-input" type="password" placeholder="your password"
                      value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                  </div>
                  {error && <div className="lp-error">{error}</div>}
                  <button className="lp-btn" type="submit" disabled={loading}>
                    {loading && <span className="lp-spinner" />}
                    {loading ? 'Verifying...' : 'Continue →'}
                  </button>
                </form>
                <div className="lp-footer">
                  <div className="lp-diamond" />
                  <p>Two-step authentication · Role-based access<br />HR · Supervisor · Contractor</p>
                </div>
              </>
            )}

            {/* ── Step 2: PIN ── */}
            {step === 'pin' && (
              <>
                <div className="lp-form-eye">{pinIsSet ? 'Security PIN' : 'Set Your PIN'}</div>
                <div className="lp-form-title">{pinIsSet ? 'Enter PIN' : 'Create PIN'}</div>

                {/* Authenticated user chip */}
                <div className="lp-user-chip">
                  <div className="lp-user-dot" />
                  <span style={{ fontSize: 12, color: 'white', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 2, textTransform: 'uppercase' as const }}>
                    {displayName}
                  </span>
                  <span style={{ fontSize: 10, color: '#52525b', marginLeft: 4 }}>credentials verified</span>
                </div>

                {!pinIsSet && (
                  <div style={{ background: 'rgba(220,38,38,0.06)', borderLeft: '3px solid #dc2626', padding: '10px 14px', marginBottom: 24, fontSize: 12, color: '#fca5a5', lineHeight: 1.6 }}>
                    First login — set a 4-digit security PIN. You'll need it every time you sign in.
                  </div>
                )}

                <form onSubmit={handlePIN}>
                  {pinIsSet ? (
                    <PINBoxes label="Security PIN" value={pin} onChange={setPin} autoFocus />
                  ) : (
                    <>
                      <PINBoxes label="New PIN" value={newPin} onChange={setNewPin} autoFocus />
                      <PINBoxes label="Confirm PIN" value={confirmPin} onChange={setConfirmPin} />
                    </>
                  )}
                  {error && <div className="lp-error">{error}</div>}
                  <button className="lp-btn" type="submit" disabled={loading}>
                    {loading && <span className="lp-spinner" />}
                    {loading ? 'Verifying...' : pinIsSet ? 'Access System →' : 'Set PIN & Enter →'}
                  </button>
                  <button type="button" className="lp-back" onClick={goBack}>← Back</button>
                </form>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
