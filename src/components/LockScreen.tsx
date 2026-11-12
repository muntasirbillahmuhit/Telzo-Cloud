import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Delete,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import { PlaneIcon } from './PlaneIcon';

interface LockScreenProps {
  isLocked: boolean;
  onUnlock: () => void;
  correctPasscode: string;
  onResetPasscode?: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  isLocked,
  onUnlock,
  correctPasscode,
  onResetPasscode,
}) => {
  const [inputCode, setInputCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isLocked) {
      setInputCode('');
      setError(null);
      setShake(false);
      setShowResetConfirm(false);
      setResetSuccess(false);
      // Auto-focus input when locked
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isLocked]);

  if (!isLocked) return null;

  const handleVerify = (codeToVerify: string = inputCode) => {
    if (!codeToVerify) {
      setError('Please enter your passcode.');
      return;
    }

    if (codeToVerify === correctPasscode) {
      setError(null);
      setInputCode('');
      onUnlock();
    } else {
      setError('Incorrect passcode. Please try again.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setInputCode('');
      inputRef.current?.focus();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify(inputCode);
  };

  const handleKeypadPress = (val: string) => {
    if (inputCode.length >= 16) return;
    const next = inputCode + val;
    setInputCode(next);
    setError(null);
    // If entered passcode reaches correctPasscode length and matches, auto-unlock
    if (next.length === correctPasscode.length && next === correctPasscode) {
      setTimeout(() => {
        handleVerify(next);
      }, 100);
    }
  };

  const handleBackspace = () => {
    setInputCode((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleResetToDefault = () => {
    if (onResetPasscode) {
      onResetPasscode();
      setResetSuccess(true);
      setError(null);
      setShowResetConfirm(false);
      setTimeout(() => setResetSuccess(false), 3000);
    }
  };

  const isDefaultCode = correctPasscode === '1234';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        overflowY: 'auto',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Security Auto-Lock Screen"
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'var(--card)',
          borderRadius: 28,
          padding: '28px 22px 24px',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.22)',
          border: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: shake ? 'shake 0.4s ease' : undefined,
          transition: 'transform 0.2s ease',
        }}
      >
        {/* Animated Brand & Lock Badge */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <div
            className="logo"
            style={{
              width: 58,
              height: 58,
              background: 'var(--blue)',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 8px 24px rgba(90, 139, 255, 0.35)',
            }}
          >
            <PlaneIcon size={26} />
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: -4,
              right: -4,
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'var(--btn)',
              color: 'var(--btn-ink)',
              display: 'grid',
              placeItems: 'center',
              border: '2px solid var(--card)',
            }}
          >
            <Lock size={13} />
          </div>
        </div>

        {/* Title & Inactivity Notice */}
        <h1
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: 'var(--ink)',
            marginBottom: 4,
            textAlign: 'center',
            letterSpacing: '-0.02em',
          }}
        >
          Session Locked
        </h1>
        <p
          style={{
            fontSize: 13,
            color: 'var(--muted)',
            textAlign: 'center',
            marginBottom: 20,
            lineHeight: 1.45,
          }}
        >
          Protected due to <b>1 minute</b> of inactivity. Enter your passcode to resume TELZO CLOUD.
        </p>

        {/* Reset Success Banner */}
        {resetSuccess && (
          <div
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 14,
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981',
              fontSize: 12.5,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 14,
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>Passcode reset to default: <b>1234</b></span>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 14,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.28)',
              color: '#ef4444',
              fontSize: 12.5,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 14,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Passcode Form */}
        <form onSubmit={handleFormSubmit} style={{ width: '100%' }}>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <input
              ref={inputRef}
              type={showPassword ? 'text' : 'password'}
              inputMode="numeric"
              placeholder="Enter passcode"
              value={inputCode}
              onChange={(e) => {
                setInputCode(e.target.value);
                if (error) setError(null);
              }}
              style={{
                width: '100%',
                height: 50,
                borderRadius: 16,
                border: error ? '1.5px solid #ef4444' : '1px solid var(--line)',
                background: 'var(--chip)',
                color: 'var(--ink)',
                fontSize: 18,
                fontWeight: 700,
                textAlign: 'center',
                letterSpacing: showPassword ? 'normal' : '0.25em',
                padding: '0 44px',
                outline: 'none',
                fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 0,
                color: 'var(--muted)',
                cursor: 'pointer',
                padding: 4,
                display: 'grid',
                placeItems: 'center',
              }}
              aria-label={showPassword ? 'Hide passcode' : 'Show passcode'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Quick Touch Keypad for numeric PIN entry */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              marginBottom: 16,
            }}
          >
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit)}
                style={{
                  height: 48,
                  borderRadius: 14,
                  border: '1px solid var(--line)',
                  background: 'var(--card)',
                  color: 'var(--ink)',
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: 'inherit',
                  transition: 'background 0.15s, transform 0.1s',
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setInputCode('')}
              style={{
                height: 48,
                borderRadius: 14,
                border: '1px solid var(--line)',
                background: 'var(--chip)',
                color: 'var(--muted)',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                fontFamily: 'inherit',
              }}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              style={{
                height: 48,
                borderRadius: 14,
                border: '1px solid var(--line)',
                background: 'var(--card)',
                color: 'var(--ink)',
                fontSize: 18,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                fontFamily: 'inherit',
                transition: 'background 0.15s, transform 0.1s',
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              style={{
                height: 48,
                borderRadius: 14,
                border: '1px solid var(--line)',
                background: 'var(--chip)',
                color: 'var(--muted)',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
              }}
              aria-label="Backspace"
            >
              <Delete size={18} />
            </button>
          </div>

          {/* Unlock Submit Button */}
          <button
            type="submit"
            className="signin"
            style={{
              width: '100%',
              height: 48,
              borderRadius: 16,
              background: 'var(--btn)',
              color: 'var(--btn-ink)',
              fontSize: 14.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
              border: 0,
              fontFamily: 'inherit',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
            }}
          >
            <ShieldCheck size={18} />
            <span>Unlock Telzo Cloud</span>
          </button>
        </form>

        {/* Helpful Default Hint */}
        {isDefaultCode && (
          <div
            style={{
              marginTop: 14,
              padding: '8px 12px',
              borderRadius: 12,
              background: 'var(--chip)',
              fontSize: 12,
              color: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              width: '100%',
              justifyContent: 'center',
            }}
          >
            <KeyRound size={14} style={{ color: 'var(--blue)', flexShrink: 0 }} />
            <span>
              Default passcode: <b>1234</b>
            </span>
          </div>
        )}

        {/* Reset Passcode Option if forgotten */}
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          {!showResetConfirm ? (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              style={{
                background: 'none',
                border: 0,
                color: 'var(--muted)',
                fontSize: 12,
                cursor: 'pointer',
                textDecoration: 'underline',
                fontFamily: 'inherit',
              }}
            >
              Forgot passcode?
            </button>
          ) : (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 14,
                background: 'var(--chip)',
                border: '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}>
                Reset passcode back to default (1234)?
              </span>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 10,
                    background: 'var(--blue)',
                    color: '#fff',
                    border: 0,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Yes, Reset to 1234
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 10,
                    background: 'transparent',
                    color: 'var(--muted)',
                    border: '1px solid var(--line)',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
};
