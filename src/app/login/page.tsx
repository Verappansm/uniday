'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0a0a1a 100%)',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background decorations */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        right: '-10%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-20%',
        left: '-10%',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124, 58, 237, 0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="glass-card fade-in" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '48px 40px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, var(--accent-primary), #7c3aed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '28px',
          }}>
            🎓
          </div>
          <h1 style={{
            fontSize: '1.8rem',
            fontWeight: 800,
            marginBottom: '8px',
          }}>
            <span className="gradient-text">UniDay</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Award Ceremony Management Portal
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: '8px',
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
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: '8px',
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
            />
          </div>

          {error && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'var(--danger-glow)',
              color: 'var(--danger)',
              fontSize: '0.85rem',
              marginBottom: '20px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', fontSize: '1rem', padding: '16px' }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div style={{
          marginTop: '32px',
          padding: '16px',
          borderRadius: '12px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
        }}>
          <p style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
            lineHeight: 1.6,
          }}>
            Roles: <span style={{ color: 'var(--accent-secondary)' }}>Admin</span> · 
            <span style={{ color: 'var(--success)' }}> Volunteer</span> · 
            <span style={{ color: 'var(--warning)' }}> MC Panel</span>
          </p>
        </div>
      </div>
    </div>
  );
}
