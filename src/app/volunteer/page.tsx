'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Student {
  student_name: string;
  register_no: string;
  school: string;
  branch: string;
  program: string;
  awards: { type: string; details: string }[];
  seat?: { section: string; row: string; column: number; type: string };
  seating_category: string;
}

export default function VolunteerPage() {
  const [mode, setMode] = useState<'scan' | 'search'>('scan');
  const [result, setResult] = useState<{ student: Student; status: string } | null>(null);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const handleCheckin = async (token?: string, register_no?: string) => {
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(token ? { token } : { register_no }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setResult({ student: data.student, status: 'already' });
      } else if (res.ok) {
        setResult({ student: data.student, status: 'success' });
      } else {
        setError(data.error || 'Check-in failed');
      }
    } catch {
      setError('Network error');
    }
  };

  const startScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setScanning(true);

      // Use BarcodeDetector API if available
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        scanIntervalRef.current = setInterval(async () => {
          if (videoRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            ctx?.drawImage(videoRef.current, 0, 0);
            try {
              const barcodes = await detector.detect(canvas);
              if (barcodes.length > 0) {
                const value = barcodes[0].rawValue;
                stopScanner();
                handleCheckin(value);
              }
            } catch { /* retry next interval */ }
          }
        }, 500);
      }
    } catch (err) {
      setError('Camera access denied. Use manual search instead.');
    }
  };

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => stopScanner();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(searchQuery)}&limit=10`);
      const data = await res.json();
      setSearchResults(data.users || []);
    } catch {
      setError('Search failed');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const seatLabel = (s: Student) => {
    if (s.seating_category === 'gallery') return 'Gallery';
    if (s.seat?.section) return `${s.seat.section}-${s.seat.row}${s.seat.column}`;
    return 'N/A';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      padding: '16px',
      maxWidth: '480px',
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800 }}>
            <span className="gradient-text">Volunteer</span>
          </h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Check-in Portal</p>
        </div>
        <button onClick={handleLogout} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
          Logout
        </button>
      </div>

      {/* Mode toggles */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={() => { setMode('scan'); setResult(null); setError(''); }}
          style={{
            flex: 1,
            padding: '14px',
            borderRadius: '12px',
            border: `2px solid ${mode === 'scan' ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
            background: mode === 'scan' ? 'var(--accent-glow)' : 'var(--bg-card)',
            color: mode === 'scan' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.9rem',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          📷 QR Scan
        </button>
        <button
          onClick={() => { setMode('search'); stopScanner(); setResult(null); setError(''); }}
          style={{
            flex: 1,
            padding: '14px',
            borderRadius: '12px',
            border: `2px solid ${mode === 'search' ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
            background: mode === 'search' ? 'var(--accent-glow)' : 'var(--bg-card)',
            color: mode === 'search' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.9rem',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          🔍 Manual Search
        </button>
      </div>

      {/* QR Scanner */}
      {mode === 'scan' && (
        <div className="fade-in">
          <div className="glass-card" style={{ padding: '20px', marginBottom: '16px', textAlign: 'center' }}>
            {!scanning ? (
              <button onClick={startScanner} className="btn-primary" style={{ width: '100%' }}>
                Start Camera
              </button>
            ) : (
              <>
                <video
                  ref={videoRef}
                  style={{ width: '100%', borderRadius: '12px', marginBottom: '12px' }}
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <button onClick={stopScanner} className="btn-danger" style={{ width: '100%' }}>
                  Stop Camera
                </button>
              </>
            )}
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '12px' }}>
              Point camera at student&apos;s QR code to check them in
            </p>
          </div>

          {/* Manual QR input fallback */}
          <div className="glass-card" style={{ padding: '16px' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Or paste QR token manually:
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="input-field"
                placeholder="Paste QR token..."
                id="qr-manual-input"
                style={{ fontSize: '0.85rem' }}
              />
              <button
                onClick={() => {
                  const input = document.getElementById('qr-manual-input') as HTMLInputElement;
                  if (input.value) handleCheckin(input.value);
                }}
                className="btn-primary"
                style={{ whiteSpace: 'nowrap', padding: '12px 20px' }}
              >
                Check In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Search */}
      {mode === 'search' && (
        <div className="fade-in">
          <div className="glass-card" style={{ padding: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="input-field"
                placeholder="Search by name or register no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                style={{ fontSize: '0.85rem' }}
              />
              <button onClick={handleSearch} className="btn-primary" style={{ padding: '12px 20px', whiteSpace: 'nowrap' }}>
                Search
              </button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {searchResults.map((s: any) => (
                <div key={s._id} className="glass-card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{s.student_name}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.register_no}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.school} · {s.branch}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Seat: {seatLabel(s)}</p>
                    </div>
                    <button
                      onClick={() => handleCheckin(undefined, s.register_no)}
                      className={s.checked_in ? 'btn-secondary' : 'btn-success'}
                      style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                      disabled={s.checked_in}
                    >
                      {s.checked_in ? '✓ Present' : 'Check In'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="fade-in" style={{
          padding: '16px',
          borderRadius: '12px',
          background: 'var(--danger-glow)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: 'var(--danger)',
          marginTop: '16px',
          textAlign: 'center',
          fontWeight: 600,
        }}>
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="fade-in" style={{ marginTop: '16px' }}>
          <div className="glass-card" style={{
            padding: '24px',
            borderColor: result.status === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)',
          }}>
            {result.status === 'success' ? (
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '3rem' }}>✅</div>
                <h3 style={{ color: 'var(--success)', fontSize: '1.1rem', fontWeight: 700 }}>Checked In!</h3>
              </div>
            ) : (
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '3rem' }}>⚠️</div>
                <h3 style={{ color: 'var(--warning)', fontSize: '1.1rem', fontWeight: 700 }}>Already Checked In</h3>
              </div>
            )}

            <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
              <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>{result.student.student_name}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{result.student.register_no}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{result.student.school} · {result.student.branch}</p>
              <div style={{ marginTop: '12px', padding: '12px', background: 'var(--accent-glow)', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Seat</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-secondary)' }}>
                  {seatLabel(result.student)}
                </div>
              </div>
              {result.student.awards.length > 0 && (
                <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {result.student.awards.map((a, i) => (
                    <span key={i} className="badge badge-accent">{a.type}: {a.details}</span>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => { setResult(null); setError(''); }}
              className="btn-secondary"
              style={{ width: '100%', marginTop: '16px' }}
            >
              Scan Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
