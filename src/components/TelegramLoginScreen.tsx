import React, { useState, useEffect } from 'react';
import { PlaneIcon } from './PlaneIcon';
import { Lock, Monitor, Cloud, ArrowLeft, X, ChevronDown, Key, RefreshCw, Shield, CheckCircle2 } from 'lucide-react';
import { TelegramUser } from '../types';

interface TelegramLoginScreenProps {
  onBack: () => void;
  onSignIn: (username: string, displayName: string) => Promise<TelegramUser>;
  onRefreshData: () => void;
}

const COUNTRY_CODES = [
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
  { code: '+1', country: 'United States', flag: '🇺🇸' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+971', country: 'United Arab Emirates', flag: '🇦🇪' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+7', country: 'Russia', flag: '🇷🇺' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
];

export const TelegramLoginScreen: React.FC<TelegramLoginScreenProps> = ({
  onBack,
  onRefreshData,
}) => {
  const [screen, setScreen] = useState<'landing' | 'phone' | 'code' | 'password' | 'ready'>('landing');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [tdlibStatus, setTdlibStatus] = useState<any>(null);

  const checkStatuses = async () => {
    try {
      const tRes = await fetch('/api/telegram/status');
      if (tRes.ok) {
        const tData = await tRes.json();
        setTdlibStatus(tData.data || tData);
        if (tData.data?.tdlibReady || tData?.tdlibReady) {
          setScreen('ready');
        }
      }
    } catch (e) {
      console.warn('Status check warning:', e);
    }
  };

  useEffect(() => {
    checkStatuses();
  }, []);

  const handleSendPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = phoneNumber.trim().replace(/^0+/, '');
    if (!cleanNumber) {
      setError('Please enter your phone number.');
      return;
    }
    const fullPhone = `${selectedCountry.code}${cleanNumber}`;
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/telegram/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullPhone }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to send verification code.');
      }
      setScreen(data.authState === 'waitPassword' ? 'password' : 'code');
      setSuccessMsg('Verification code sent! Please check your official Telegram app.');
      checkStatuses();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authorization request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authCode.trim()) {
      setError('Please enter the verification code sent to your Telegram account.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/telegram/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: authCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Invalid verification code.');
      }
      if (data.authState === 'waitPassword') {
        setScreen('password');
        setSuccessMsg('Two-factor password required. Enter your Telegram 2FA cloud password.');
      } else if (data.authState === 'ready') {
        setScreen('ready');
        setSuccessMsg('Telegram Cloud Storage successfully connected!');
        if (onRefreshData) onRefreshData();
        checkStatuses();
        setTimeout(onBack, 1200);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to verify code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your 2FA cloud password.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/telegram/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Invalid 2FA password.');
      }
      if (data.authState === 'ready') {
        setScreen('ready');
        setSuccessMsg('Telegram Cloud Storage connected!');
        if (onRefreshData) onRefreshData();
        checkStatuses();
        setTimeout(onBack, 1200);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to verify password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanRecovery = async () => {
    setIsScanning(true);
    setError(null);
    try {
      const res = await fetch('/api/recovery/scan', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Scan failed.');
      }
      setSuccessMsg(`Index scanned: ${data.scannedFolders?.length || 0} folder channels discovered.`);
      if (onRefreshData) onRefreshData();
      checkStatuses();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Scan and recovery failed.');
    } finally {
      setIsScanning(false);
    }
  };

  const userInitials = (tdlibStatus?.user?.firstName || 'TG').slice(0, 2).toUpperCase();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#f2f2ef',
        zIndex: 9999,
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: 440,
          width: '100%',
          background: '#f2f2ef',
          borderRadius: 28,
          padding: '28px 24px 32px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.12)',
          color: '#0f172a',
          position: 'relative',
        }}
      >
        {screen === 'ready' || tdlibStatus?.tdlibReady ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: '#5085f8',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <PlaneIcon size={18} color="#fff" />
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 800 }}>Telegram Cloud Engine</h2>
              </div>
              <button
                onClick={onBack}
                style={{ background: 'none', border: 0, cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {successMsg && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  color: '#16a34a',
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 12,
                }}
              >
                {successMsg}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  background: '#ffffff',
                  padding: 16,
                  borderRadius: 18,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: '#0f172a',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 800,
                    fontSize: 15,
                  }}
                >
                  {userInitials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 15, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tdlibStatus?.user
                      ? `${tdlibStatus.user.firstName || ''} ${tdlibStatus.user.lastName || ''}`.trim()
                      : 'Telegram User'}
                  </b>
                  <span style={{ fontSize: 13, color: '#64748b' }}>
                    @{tdlibStatus?.user?.username || 'telegram_user'}
                  </span>
                </div>
                <span
                  style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: 9999,
                  }}
                >
                  Online
                </span>
              </div>

              <div
                style={{
                  background: '#ffffff',
                  borderRadius: 16,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  fontSize: 13,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>OIDC Identity</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#16a34a', fontWeight: 700 }}>
                    <Shield size={14} /> Verified (PKCE S256)
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>TDLib Native Engine</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#16a34a', fontWeight: 700 }}>
                    <CheckCircle2 size={14} /> Active
                  </span>
                </div>
                {tdlibStatus?.indexChannelId && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>Index Channel</span>
                    <span style={{ color: '#5085f8', fontWeight: 700, fontFamily: 'monospace', fontSize: 12 }}>
                      ID {tdlibStatus.indexChannelId}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={handleScanRecovery}
                  disabled={isScanning}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 14,
                    border: 'none',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                  }}
                >
                  <RefreshCw size={14} className={isScanning ? 'spin' : ''} />
                  <span>{isScanning ? 'Scanning...' : 'Scan & Recover Index'}</span>
                </button>

                <button
                  type="button"
                  onClick={onBack}
                  style={{
                    height: 44,
                    padding: '0 20px',
                    borderRadius: 14,
                    border: 'none',
                    background: '#0f172a',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Continue to App
                </button>
              </div>
            </div>
          </div>
        ) : screen === 'landing' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  background: '#5085f8',
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: '0 6px 16px rgba(80, 133, 248, 0.35)',
                }}
              >
                <PlaneIcon size={24} color="#ffffff" />
              </div>

              <button
                onClick={onBack}
                style={{ background: 'none', border: 0, cursor: 'pointer', color: '#64748b', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <h1
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: 1.12,
                letterSpacing: '-0.5px',
                marginBottom: 12,
              }}
            >
              Your Telegram,
              <br />
              as a cloud drive.
            </h1>

            <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.48, marginBottom: 24, fontWeight: 500 }}>
              Sign in once. Your files live in your own Telegram account — Telefy keeps the folders.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: '#ffffff',
                    display: 'grid',
                    placeItems: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    flexShrink: 0,
                  }}
                >
                  <Lock size={18} color="#0f172a" />
                </div>
                <div>
                  <b style={{ fontSize: 14, fontWeight: 700, display: 'block', color: '#0f172a' }}>Private</b>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Only you can see your files</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: '#ffffff',
                    display: 'grid',
                    placeItems: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    flexShrink: 0,
                  }}
                >
                  <Monitor size={18} color="#0f172a" />
                </div>
                <div>
                  <b style={{ fontSize: 14, fontWeight: 700, display: 'block', color: '#0f172a' }}>Everywhere</b>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Phone, web, Mac and iPhone</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: '#ffffff',
                    display: 'grid',
                    placeItems: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    flexShrink: 0,
                  }}
                >
                  <Cloud size={18} color="#0f172a" />
                </div>
                <div>
                  <b style={{ fontSize: 14, fontWeight: 700, display: 'block', color: '#0f172a' }}>Free</b>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Uses the storage Telegram gives you</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setError(null);
                setScreen('phone');
              }}
              style={{
                width: '100%',
                height: 52,
                borderRadius: 9999,
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: '0 8px 20px rgba(15, 23, 42, 0.25)',
              }}
            >
              <PlaneIcon size={18} color="#ffffff" />
              <span>Connect Telegram</span>
            </button>
          </div>
        ) : screen === 'phone' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <button
                onClick={() => {
                  setError(null);
                  setScreen('landing');
                }}
                style={{ background: 'none', border: 0, cursor: 'pointer', color: '#0f172a', padding: 4 }}
              >
                <ArrowLeft size={22} />
              </button>
              <button onClick={onBack} style={{ background: 'none', border: 0, cursor: 'pointer', color: '#64748b', padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 22,
                  background: '#5085f8',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto',
                  boxShadow: '0 8px 20px rgba(80, 133, 248, 0.3)',
                }}
              >
                <Cloud size={36} color="#ffffff" fill="#ffffff" />
              </div>
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', textAlign: 'center', marginBottom: 8 }}>
              Connect Telegram
            </h2>

            <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 1.45, marginBottom: 24, padding: '0 6px' }}>
              Sign in to your own Telegram account. Telefy Cloud uses your Saved Messages as private cloud storage.
            </p>

            {error && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#ef4444',
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 16,
                  textAlign: 'center',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSendPhone} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10, position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown((prev) => !prev)}
                  style={{
                    height: 52,
                    padding: '0 12px',
                    borderRadius: 14,
                    border: 'none',
                    background: '#e5e5e2',
                    color: '#0f172a',
                    fontSize: 14,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <span>{selectedCountry.flag}</span>
                  <span>{selectedCountry.code}</span>
                  <ChevronDown size={14} color="#64748b" />
                </button>

                {showCountryDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 56,
                      left: 0,
                      width: 220,
                      maxHeight: 200,
                      overflowY: 'auto',
                      background: '#ffffff',
                      borderRadius: 16,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                      zIndex: 50,
                      padding: 6,
                    }}
                  >
                    {COUNTRY_CODES.map((c) => (
                      <button
                        key={c.code + c.country}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(c);
                          setShowCountryDropdown(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: 'none',
                          background: selectedCountry.code === c.code ? '#f1f5f9' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 13,
                          fontWeight: selectedCountry.code === c.code ? 700 : 500,
                          color: '#0f172a',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span>{c.flag}</span>
                        <span style={{ flex: 1 }}>{c.country}</span>
                        <span style={{ color: '#64748b', fontSize: 12 }}>{c.code}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ flex: 1, position: 'relative' }}>
                  <label
                    style={{
                      position: 'absolute',
                      top: -9,
                      left: 12,
                      background: '#f2f2ef',
                      padding: '0 5px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#0f172a',
                      zIndex: 2,
                    }}
                  >
                    Phone number
                  </label>
                  <input
                    type="tel"
                    placeholder="01712 345678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    autoFocus
                    style={{
                      width: '100%',
                      height: 52,
                      borderRadius: 14,
                      border: '2px solid #0f172a',
                      background: 'transparent',
                      padding: '0 14px',
                      color: '#0f172a',
                      fontSize: 15,
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 12px', lineHeight: 1.4 }}>
                Type your number the normal way — no need to add {selectedCountry.code}. Telegram will send you a login code.
              </p>

              <button
                type="submit"
                disabled={isLoading || !phoneNumber.trim()}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 14,
                  background: phoneNumber.trim() ? '#0f172a' : '#d4d4d0',
                  color: phoneNumber.trim() ? '#ffffff' : '#888884',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: phoneNumber.trim() && !isLoading ? 'pointer' : 'not-allowed',
                }}
              >
                <span>{isLoading ? 'Sending Code...' : 'Send code'}</span>
              </button>
            </form>
          </div>
        ) : screen === 'code' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <button onClick={() => { setError(null); setScreen('phone'); }} style={{ background: 'none', border: 0, cursor: 'pointer', color: '#0f172a', padding: 4 }}>
                <ArrowLeft size={22} />
              </button>
              <button onClick={onBack} style={{ background: 'none', border: 0, cursor: 'pointer', color: '#64748b', padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 22,
                  background: '#5085f8',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto',
                  boxShadow: '0 8px 20px rgba(80, 133, 248, 0.3)',
                }}
              >
                <Key size={34} color="#ffffff" />
              </div>
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', textAlign: 'center', marginBottom: 8 }}>
              Enter Code
            </h2>

            <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 1.45, marginBottom: 24 }}>
              Telegram sent a login code to your official Telegram app. Enter it below to authorize.
            </p>

            {error && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#ef4444',
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 16,
                  textAlign: 'center',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ position: 'relative' }}>
                <label
                  style={{
                    position: 'absolute',
                    top: -9,
                    left: 12,
                    background: '#f2f2ef',
                    padding: '0 5px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#0f172a',
                    zIndex: 2,
                  }}
                >
                  Login code
                </label>
                <input
                  type="text"
                  placeholder="e.g. 12345"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    height: 52,
                    borderRadius: 14,
                    border: '2px solid #0f172a',
                    background: 'transparent',
                    padding: '0 14px',
                    color: '#0f172a',
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: 4,
                    textAlign: 'center',
                    outline: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !authCode.trim()}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 14,
                  background: authCode.trim() ? '#0f172a' : '#d4d4d0',
                  color: authCode.trim() ? '#ffffff' : '#888884',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: authCode.trim() && !isLoading ? 'pointer' : 'not-allowed',
                }}
              >
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <button onClick={() => { setError(null); setScreen('code'); }} style={{ background: 'none', border: 0, cursor: 'pointer', color: '#0f172a', padding: 4 }}>
                <ArrowLeft size={22} />
              </button>
              <button onClick={onBack} style={{ background: 'none', border: 0, cursor: 'pointer', color: '#64748b', padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 22,
                  background: '#5085f8',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto',
                  boxShadow: '0 8px 20px rgba(80, 133, 248, 0.3)',
                }}
              >
                <Lock size={34} color="#ffffff" />
              </div>
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', textAlign: 'center', marginBottom: 8 }}>
              2FA Password
            </h2>

            <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 1.45, marginBottom: 24 }}>
              Your Telegram account is protected with a 2FA cloud password. Enter it below to complete sign in.
            </p>

            {error && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#ef4444',
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 16,
                  textAlign: 'center',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleVerifyPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ position: 'relative' }}>
                <label
                  style={{
                    position: 'absolute',
                    top: -9,
                    left: 12,
                    background: '#f2f2ef',
                    padding: '0 5px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#0f172a',
                    zIndex: 2,
                  }}
                >
                  2FA Password
                </label>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    height: 52,
                    borderRadius: 14,
                    border: '2px solid #0f172a',
                    background: 'transparent',
                    padding: '0 14px',
                    color: '#0f172a',
                    fontSize: 15,
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !password}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 14,
                  background: password ? '#0f172a' : '#d4d4d0',
                  color: password ? '#ffffff' : '#888884',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: password && !isLoading ? 'pointer' : 'not-allowed',
                }}
              >
                {isLoading ? 'Verifying Password...' : 'Verify Password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
