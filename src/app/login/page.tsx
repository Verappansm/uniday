'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const Silk = dynamic(() => import('@/components/Silk'), { ssr: false });

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Redirect based on role
      switch (data.role) {
        case 'admin':
          router.push('/admin');
          break;
        case 'volunteer':
          router.push('/volunteer');
          break;
        case 'mc':
          router.push('/mc');
          break;
        default:
          router.push('/admin');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      suppressHydrationWarning
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'max(16px, 2vh)',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif",
      }}
    >
      {/* Silk background */}
      {isMounted && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 0,
            pointerEvents: 'none',
          }}>
          <Silk speed={2} scale={1.2} noiseIntensity={1.5} rotation={0} />
        </div>
      )}

      {/* Overlay for better text readability */}
      <div 
        suppressHydrationWarning
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'radial-gradient(ellipse at center, rgba(10, 10, 15, 0.4) 0%, rgba(10, 10, 20, 0.7) 100%)',
          zIndex: 1,
          pointerEvents: 'none',
        }} />

      {/* College Logos Container */}
      <div
        suppressHydrationWarning
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 'clamp(30px, 8vw, 60px)',
          zIndex: 10,
          marginBottom: 'clamp(24px, 4vh, 40px)',
        }}>
        {/* Logo 1 */}
        <Image
          src="/logo1.png"
          alt="College 1"
          width={100}
          height={100}
          style={{
            width: 'clamp(100px, 18vw, 160px)',
            height: 'auto',
            filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))',
          }}
          onError={() => { }}
          priority
        />

        {/* Logo 2 */}
        <Image
          src="/logo2.png"
          alt="College 2"
          width={100}
          height={100}
          style={{
            width: 'clamp(100px, 18vw, 160px)',
            height: 'auto',
            filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))',
          }}
          onError={() => { }}
          priority
        />
      </div>

      <div className="glass-card fade-in" style={{
        width: '100%',
        maxWidth: 'clamp(320px, 90vw, 420px)',
        padding: 'clamp(28px, 5vh, 40px) clamp(24px, 4vw, 36px)',
        position: 'relative',
        zIndex: 2,
        background: 'rgba(15, 15, 20, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(80, 80, 80, 0.5)',
        marginTop: 'clamp(-30px, -4vh, -50px)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 'clamp(24px, 3vh, 32px)' }}>
          <div style={{
            width: 'clamp(52px, 10vw, 64px)',
            height: 'clamp(52px, 10vw, 64px)',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #4a4a4a, #3a3a3a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto clamp(12px, 2vh, 20px)',
            fontSize: 'clamp(24px, 6vw, 28px)',
          }}>
            🎓
          </div>
          <h1 style={{
            fontSize: 'clamp(1.5rem, 5vw, 1.8rem)',
            fontWeight: 700,
            marginBottom: '6px',
            color: '#ffffff',
            letterSpacing: '-0.5px',
          }}>
            University Day
          </h1>
          <p style={{ color: '#a0a0a0', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', lineHeight: 1.4 }}>
            Award Ceremony Management Portal
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 'clamp(14px, 2vh, 20px)' }}>
            <label style={{
              display: 'block',
              fontSize: 'clamp(0.7rem, 1.5vw, 0.8rem)',
              fontWeight: 600,
              color: '#c0c0c0',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>Username</label>
            <input
              type="text"
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              style={{ fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}
            />
          </div>

          <div style={{ marginBottom: 'clamp(18px, 2.5vh, 24px)' }}>
            <label style={{
              display: 'block',
              fontSize: 'clamp(0.7rem, 1.5vw, 0.8rem)',
              fontWeight: 600,
              color: '#c0c0c0',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>Password</label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              style={{ fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}
            />
          </div>

          {error && (
            <div style={{
              padding: 'clamp(10px, 1.5vh, 12px) clamp(12px, 2vw, 16px)',
              borderRadius: '10px',
              background: 'rgba(80, 80, 80, 0.3)',
              color: '#e0e0e0',
              fontSize: 'clamp(0.75rem, 1.5vw, 0.85rem)',
              marginBottom: 'clamp(14px, 2vh, 20px)',
              border: '1px solid rgba(120, 120, 120, 0.5)',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', fontSize: 'clamp(0.9rem, 2vw, 1rem)', padding: 'clamp(12px, 2vh, 16px)', background: 'rgba(100, 100, 100, 0.15)', color: '#d0d0d0', border: '1px solid rgba(150, 150, 150, 0.4)', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, borderRadius: '8px', transition: 'all 0.2s', boxShadow: 'none', backdropFilter: 'blur(8px)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(120, 120, 120, 0.25)';
              e.currentTarget.style.border = '1px solid rgba(180, 180, 180, 0.6)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(100, 100, 100, 0.15)';
              e.currentTarget.style.border = '1px solid rgba(150, 150, 150, 0.4)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div style={{
          marginTop: 'clamp(20px, 2.5vh, 28px)',
          padding: 'clamp(12px, 1.5vh, 16px)',
          borderRadius: '10px',
          background: 'rgba(40, 40, 40, 0.5)',
          border: '1px solid rgba(100, 100, 100, 0.3)',
        }}>
          <p style={{
            fontSize: 'clamp(0.7rem, 1.5vw, 0.75rem)',
            color: '#b0b0b0',
            textAlign: 'center',
            lineHeight: 1.5,
            marginBottom: 0,
          }}>
            Roles: <span style={{ color: '#d0d0d0', fontWeight: 500 }}>Admin</span> · 
            <span style={{ color: '#b0b0b0' }}> Volunteer</span> · 
            <span style={{ color: '#a0a0a0' }}> MC</span>
          </p>
        </div>
      </div>
    </div>
  );
}
