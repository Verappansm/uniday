'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Student {
  _id?: string;
  student_name: string;
  register_no: string;
  school: string;
  branch: string;
  program: string;
  qr_code?: string;
  awards: { type: string; details: string }[];
  seat?: { section: string; row: string; column: number; type: string };
  seating_category: string;
  checked_in?: boolean;
}

interface SeatMap {
  section: string;
  rows: Array<{
    row: string;
    seats: Array<{
      key: string;
      column: number;
      state: 'empty' | 'reserved' | 'checked_in' | 'rsvp_yes' | 'rsvp_no';
      student: { register_no: string } | null;
    }>;
  }>;
}

interface CheckInResult {
  student: Student;
  status: 'success' | 'already';
  seatMap?: SeatMap | null;
}

interface QRCodeScanResult {
  rawValue?: string;
}

interface DetailedQRScanResult extends QRCodeScanResult {
  data?: string;
}

interface QrScannerInstance {
  start(): Promise<void>;
  stop(): void;
  destroy(): void;
}

const seatToneMap: Record<SeatMap['rows'][number]['seats'][number]['state'], string> = {
  empty: 'seat-cell seat-empty',
  reserved: 'seat-cell seat-reserved',
  checked_in: 'seat-cell seat-checked-in',
  rsvp_yes: 'seat-cell seat-rsvp-yes',
  rsvp_no: 'seat-cell seat-rsvp-no',
};

function seatLabel(student: Student) {
  if (student.seating_category === 'gallery' || student.seat?.type?.toLowerCase() === 'gallery') return 'Gallery Area';
  if (student.seat?.section) return `${student.seat.section}-${student.seat.row}${student.seat.column}`;
  return 'N/A';
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-primary)',
    padding: '20px 16px',
    color: 'var(--text-primary)',
  } as const,
  shell: {
    width: '100%',
    maxWidth: '640px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  } as const,
  headerCard: {
    overflow: 'hidden',
    borderColor: 'var(--border-accent)',
  } as const,
  headerTop: {
    borderBottom: '1px solid var(--border-subtle)',
    background: 'rgba(255,255,255,0.05)',
    padding: '16px 20px',
  } as const,
  headerRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
  } as const,
  eyebrow: {
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.24em',
    color: 'var(--text-muted)',
  } as const,
  title: {
    marginTop: '4px',
    fontSize: '1.95rem',
    fontWeight: 900,
    lineHeight: 1.05,
    letterSpacing: '-0.03em',
  } as const,
  subtitle: {
    marginTop: '8px',
    maxWidth: '360px',
    fontSize: '0.92rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  } as const,
  logoutButton: {
    flexShrink: 0,
    padding: '10px 16px',
    fontSize: '0.88rem',
  } as const,
  modeGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    padding: '16px',
  } as const,
  modeCardBase: {
    borderRadius: '16px',
    border: '1px solid var(--border-subtle)',
    padding: '14px 16px',
    textAlign: 'left' as const,
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },
  sectionCard: {
    padding: '18px 18px 20px',
  } as const,
  sectionHeader: {
    marginBottom: '16px',
  } as const,
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: 800,
  } as const,
  sectionText: {
    marginTop: '4px',
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.45,
  } as const,
  scanHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '16px',
  } as const,
  scanShell: {
    borderRadius: '24px',
    border: '1px dashed var(--border-accent)',
    background: 'rgba(255,255,255,0.02)',
    padding: '12px',
  } as const,
  scanIdle: {
    minHeight: '224px',
    borderRadius: '18px',
    background: 'rgba(255,255,255,0.02)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    textAlign: 'center' as const,
  } as const,
  qrBadge: {
    marginBottom: '16px',
    width: '64px',
    height: '64px',
    borderRadius: '18px',
    background: 'var(--accent-glow)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.6rem',
    fontWeight: 800,
    color: 'var(--accent-secondary)',
  } as const,
  scanIdleText: {
    marginTop: '8px',
    maxWidth: '280px',
    fontSize: '0.9rem',
    lineHeight: 1.5,
    color: 'var(--text-secondary)',
  } as const,
  primaryAction: {
    marginTop: '20px',
    width: '100%',
    maxWidth: '260px',
  } as const,
  video: {
    width: '100%',
    maxHeight: '360px',
    borderRadius: '18px',
    border: '1px solid var(--border-subtle)',
    background: '#000',
    objectFit: 'cover' as const,
  } as const,
  videoFrame: {
    position: 'relative' as const,
  } as const,
  scanBox: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    width: '58%',
    aspectRatio: '1 / 1',
    transform: 'translate(-50%, -50%)',
    border: '3px solid rgba(96, 165, 250, 0.95)',
    borderRadius: '24px',
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.28), 0 0 0 2px rgba(255,255,255,0.12) inset, 0 0 28px rgba(96, 165, 250, 0.28)',
    pointerEvents: 'none' as const,
  } as const,
  scanBoxCorner: {
    position: 'absolute' as const,
    width: '20px',
    height: '20px',
    borderColor: '#ffffff',
    pointerEvents: 'none' as const,
  } as const,
  scanHint: {
    position: 'absolute' as const,
    left: '50%',
    bottom: '14px',
    transform: 'translateX(-50%)',
    padding: '8px 12px',
    borderRadius: '999px',
    background: 'rgba(5, 10, 22, 0.78)',
    border: '1px solid rgba(96, 165, 250, 0.35)',
    color: '#dbeafe',
    fontSize: '0.78rem',
    fontWeight: 600,
    letterSpacing: '0.01em',
    whiteSpace: 'nowrap' as const,
    pointerEvents: 'none' as const,
  } as const,
  videoFooter: {
    marginTop: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.03)',
    padding: '12px 14px',
  } as const,
  helperCard: {
    marginTop: '16px',
    borderRadius: '18px',
    border: '1px solid var(--border-subtle)',
    background: 'rgba(255,255,255,0.02)',
    padding: '16px',
  } as const,
  helperTitle: {
    fontSize: '0.95rem',
    fontWeight: 700,
  } as const,
  helperText: {
    marginTop: '4px',
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
  } as const,
  row: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  } as const,
  searchList: {
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  } as const,
  searchItem: {
    borderRadius: '18px',
    border: '1px solid var(--border-subtle)',
    background: 'rgba(255,255,255,0.03)',
    padding: '16px',
  } as const,
  searchRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
  } as const,
  resultCardBase: {
    overflow: 'hidden',
  } as const,
  resultTop: {
    borderBottom: '1px solid var(--border-subtle)',
    padding: '16px 20px',
  } as const,
  resultTopRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
  } as const,
  seatTile: {
    borderRadius: '18px',
    border: '1px solid var(--border-subtle)',
    background: 'rgba(255,255,255,0.03)',
    padding: '12px 16px',
    textAlign: 'center' as const,
  } as const,
  seatTileLabel: {
    fontSize: '0.65rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.16em',
    color: 'var(--text-muted)',
  } as const,
  seatTileValue: {
    marginTop: '4px',
    fontSize: '1.25rem',
    fontWeight: 900,
    color: 'var(--accent-secondary)',
  } as const,
  resultBody: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
    padding: '20px',
  } as const,
  label: {
    marginBottom: '8px',
    fontSize: '0.92rem',
    fontWeight: 700,
    color: 'var(--text-secondary)',
  } as const,
  resultTitle: {
    marginTop: '12px',
    fontSize: '1.7rem',
    fontWeight: 900,
    lineHeight: 1.1,
    letterSpacing: '-0.03em',
  } as const,
  resultMeta: {
    marginTop: '6px',
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
  } as const,
  seatMapWrap: {
    overflowX: 'auto' as const,
    borderRadius: '18px',
    border: '1px solid var(--border-subtle)',
    background: 'rgba(255,255,255,0.02)',
    padding: '12px',
  } as const,
  seatMapInner: {
    minWidth: 'max-content',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  } as const,
  seatMapRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as const,
  seatRowLabel: {
    width: '20px',
    textAlign: 'center' as const,
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
  } as const,
  seatGroup: {
    display: 'flex',
    gap: '6px',
  } as const,
  resultFooterButton: {
    width: '100%',
  } as const,
  alert: {
    borderRadius: '16px',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    background: 'var(--danger-glow)',
    padding: '14px 16px',
    fontSize: '0.92rem',
    fontWeight: 600,
    color: 'var(--danger)',
  } as const,
};

export default function VolunteerPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [mode, setMode] = useState<'scan' | 'search'>('scan');
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | React.ReactNode>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [searching, setSearching] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScannerInstance | null>(null);
  const isProcessingScanRef = useRef(false);
  const lastScannedValueRef = useRef('');
  const lastScannedAtRef = useRef(0);
  const router = useRouter();

  useEffect(() => {
    const verifyRole = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (!res.ok || (data.role !== 'volunteer' && data.role !== 'admin')) {
          router.push('/login');
          return;
        }
        setAuthChecked(true);
      } catch {
        router.push('/login');
      }
    };

    verifyRole();
  }, [router]);


  const resetFeedback = () => {
    setError('');
    setResult(null);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }

    setScanning(false);
  };

  const handleCheckin = async (token?: string, register_no?: string) => {
    setCheckingIn(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(token ? { token } : { register_no }),
      });
      const data = await response.json();

      if (response.status === 409) {
        setResult({ student: data.student, status: 'already', seatMap: data.seat_map });
      } else if (response.ok) {
        setResult({ student: data.student, status: 'success', seatMap: data.seat_map });
        setSearchResults([]);
        setSearchQuery('');
        setManualToken('');
      } else {
        setError(data.error || 'Check-in failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setCheckingIn(false);
    }
  };

  const startScanner = async () => {
    resetFeedback();

    try {
      if (!videoRef.current) {
        setError('Scanner video element is not ready. Refresh and try again.');
        return;
      }

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== 'function'
      ) {
        setError('Camera is not available in this browser or context. Use HTTPS/localhost, or switch to manual search.');
        setScanning(false);
        return;
      }

      stopScanner();

      const { default: QrScanner } = await import('qr-scanner');
      const scanner = new QrScanner(videoRef.current, (result: DetailedQRScanResult | string) => {
        const value =
          typeof result === 'string'
            ? result
            : result.data || result.rawValue || '';

        if (value) {
          const now = Date.now();
          const trimmedValue = value.trim();
          const isRapidDuplicate =
            trimmedValue === lastScannedValueRef.current &&
            now - lastScannedAtRef.current < 2000;

          if (isProcessingScanRef.current || isRapidDuplicate) {
            return;
          }

          isProcessingScanRef.current = true;
          lastScannedValueRef.current = trimmedValue;
          lastScannedAtRef.current = now;

          void handleCheckin(trimmedValue).finally(() => {
            isProcessingScanRef.current = false;
          });
        }
      }, {
        preferredCamera: 'environment',
        maxScansPerSecond: 25,
        returnDetailedScanResult: true,
        calculateScanRegion: (video) => {
          const size = Math.round(Math.min(video.videoWidth, video.videoHeight) * 0.58);
          return {
            x: Math.round((video.videoWidth - size) / 2),
            y: Math.round((video.videoHeight - size) / 2),
            width: size,
            height: size,
            downScaledWidth: 320,
            downScaledHeight: 320,
          };
        },
        onDecodeError: () => {
          // Ignore frame-level decode misses while scanning.
        },
      });
      scannerRef.current = scanner;

      await scanner.start();
      setScanning(true);
    } catch (err) {
      console.error('Camera error:', err);
      stopScanner();
      setError(
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <span>Unable to start QR scanning. Please allow camera permissions, use HTTPS/localhost, or switch to manual search.</span>
          <button 
            onClick={() => { setMode('search'); setError(''); }}
            className="btn-primary"
            style={{ width: 'auto', padding: '8px 16px', fontSize: '0.8rem' }}
          >
            Switch to Manual Search
          </button>
        </div>
      );
      setScanning(false);
    }
  };

  useEffect(() => () => stopScanner(), []);

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`/api/users?search=${encodeURIComponent(searchQuery)}&limit=10`);
      const data = await response.json();
      setSearchResults(data.users || []);
      if (!data.users?.length) {
        setError('No matching students found');
      }
    } catch {
      setError('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <section className="glass-card" style={styles.headerCard}>
          <div style={styles.headerTop}>
            <div style={styles.headerRow}>
              <div>
                <p style={styles.eyebrow}>
                  Event Day Check-In
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h1 style={{ ...styles.title, color: '#fff', margin: 0 }}>
                    Volunteer Dashboard
                  </h1>
                </div>
                <p style={styles.subtitle}>
                  Scan the QR, search a student manually, and verify seat details before directing them.
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="btn-secondary"
                style={styles.logoutButton}
              >
                Logout
              </button>
            </div>
          </div>

          <div style={styles.modeGrid}>
            <button
              onClick={() => {
                setMode('scan');
                resetFeedback();
              }}
              style={{
                ...styles.modeCardBase,
                borderColor:
                  mode === 'scan' ? 'var(--accent-primary)' : 'var(--border-subtle)',
                background:
                  mode === 'scan' ? 'var(--accent-glow)' : 'var(--bg-card)',
                color:
                  mode === 'scan' ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              <p style={{ fontSize: '0.92rem', fontWeight: 800 }}>QR Scan</p>
              <p style={{ marginTop: '4px', fontSize: '0.76rem', opacity: 0.8 }}>
                Use camera or pasted token
              </p>
            </button>
            <button
              onClick={() => {
                setMode('search');
                stopScanner();
                resetFeedback();
              }}
              style={{
                ...styles.modeCardBase,
                borderColor:
                  mode === 'search' ? 'var(--accent-primary)' : 'var(--border-subtle)',
                background:
                  mode === 'search' ? 'var(--accent-glow)' : 'var(--bg-card)',
                color:
                  mode === 'search' ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              <p style={{ fontSize: '0.92rem', fontWeight: 800 }}>Manual Search</p>
              <p style={{ marginTop: '4px', fontSize: '0.76rem', opacity: 0.8 }}>
                Find by name or register number
              </p>
            </button>
          </div>
        </section>

        {mode === 'scan' && (
          <section className="glass-card fade-in" style={styles.sectionCard}>
            <div style={styles.scanHeaderRow}>
              <div>
                <h2 style={styles.sectionTitle}>Scanner</h2>
                <p style={styles.sectionText}>
                  Point the camera at the student&apos;s QR code.
                </p>
              </div>
              <span className={scanning ? 'badge badge-success' : 'badge badge-info'}>
                {scanning ? 'Live camera' : 'Camera idle'}
              </span>
            </div>

            <div style={styles.scanShell}>
              <div style={{ ...styles.scanIdle, display: !scanning ? 'flex' : 'none' }}>
                <div style={styles.qrBadge}>
                  QR
                </div>
                <p style={{ fontSize: '1rem', fontWeight: 700 }}>Ready to start scanning</p>
                <p style={styles.scanIdleText}>
                  Use the back camera for faster QR detection. If QR scanning is not supported, paste the QR token below.
                </p>
                <button
                  onClick={startScanner}
                  className="btn-primary"
                  style={styles.primaryAction}
                  disabled={checkingIn}
                >
                  Start Camera
                </button>
              </div>

              <div style={{ display: scanning ? 'block' : 'none' }}>
                <div style={styles.videoFrame}>
                  <video
                    ref={videoRef}
                    style={styles.video}
                    playsInline
                    autoPlay
                    muted
                  />
                  <div style={styles.scanBox}>
                    <div style={{ ...styles.scanBoxCorner, top: '-3px', left: '-3px', borderTopWidth: '4px', borderLeftWidth: '4px', borderTopStyle: 'solid', borderLeftStyle: 'solid', borderTopLeftRadius: '18px' }} />
                    <div style={{ ...styles.scanBoxCorner, top: '-3px', right: '-3px', borderTopWidth: '4px', borderRightWidth: '4px', borderTopStyle: 'solid', borderRightStyle: 'solid', borderTopRightRadius: '18px' }} />
                    <div style={{ ...styles.scanBoxCorner, bottom: '-3px', left: '-3px', borderBottomWidth: '4px', borderLeftWidth: '4px', borderBottomStyle: 'solid', borderLeftStyle: 'solid', borderBottomLeftRadius: '18px' }} />
                    <div style={{ ...styles.scanBoxCorner, bottom: '-3px', right: '-3px', borderBottomWidth: '4px', borderRightWidth: '4px', borderBottomStyle: 'solid', borderRightStyle: 'solid', borderBottomRightRadius: '18px' }} />
                  </div>
                  <div style={styles.scanHint}>Align the QR inside the box</div>
                </div>
                <div style={styles.videoFooter}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Hold the QR steady inside the camera view for a second.
                  </p>
                  <button
                    onClick={stopScanner}
                    className="btn-danger"
                    style={{ padding: '10px 16px', fontSize: '0.85rem' }}
                  >
                    Stop Camera
                  </button>
                </div>
              </div>
            </div>

            <div style={styles.helperCard}>
              <p style={styles.helperTitle}>Quick Registration Access</p>
              <p style={styles.helperText}>
                Enter Register No. if QR scanning is unavailable.
              </p>
              <div style={{ ...styles.row, marginTop: '12px' }}>
                <input
                  className="input-field"
                  placeholder="e.g. REG1001"
                  value={manualToken}
                  onChange={(event) => setManualToken(event.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && manualToken.trim() && handleCheckin(undefined, manualToken.trim())}
                />
                <button
                  onClick={() => manualToken.trim() && handleCheckin(undefined, manualToken.trim())}
                  className="btn-success"
                  style={{ whiteSpace: 'nowrap', fontWeight: 800 }}
                  disabled={checkingIn || !manualToken.trim()}
                >
                  {checkingIn ? 'Checking…' : 'Quick Check In'}
                </button>
              </div>
            </div>

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button 
                onClick={() => setMode('search')}
                className="btn-secondary"
                style={{ fontSize: '0.8rem', opacity: 0.7 }}
              >
                Search by Name instead?
              </button>
            </div>
          </section>
        )}

        {mode === 'search' && (
          <section className="glass-card fade-in" style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Manual Search</h2>
              <p style={styles.sectionText}>
                Search by student name or register number, then mark attendance manually.
              </p>
            </div>

            <div style={styles.row}>
              <input
                className="input-field"
                placeholder="Search by name or register number"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                className="btn-primary"
                style={{ whiteSpace: 'nowrap' }}
                disabled={searching || !searchQuery.trim()}
              >
                {searching ? 'Searching…' : 'Search'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div style={styles.searchList}>
                {searchResults.map((student) => (
                  <div
                    key={student._id || student.register_no}
                    style={styles.searchItem}
                  >
                    <div style={styles.searchRow}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '1rem', fontWeight: 800 }}>{student.student_name}</p>
                        <p style={{ marginTop: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {student.register_no}
                        </p>
                        <p style={{ marginTop: '4px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {student.school} · {student.branch || student.program}
                        </p>
                        <p style={{
                          marginTop: '8px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.12em',
                          color: 'var(--text-muted)',
                        }}>
                          Seat {seatLabel(student)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCheckin(undefined, student.register_no)}
                        className={student.checked_in ? 'btn-secondary' : 'btn-success'}
                        style={{ padding: '10px 16px', fontSize: '0.85rem' }}
                        disabled={Boolean(student.checked_in) || checkingIn}
                      >
                        {student.checked_in ? 'Present' : 'Check In'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {error && (
          <section className="fade-in" style={styles.alert}>
            {error}
          </section>
        )}

        {result && (
          <section
            className="glass-card fade-in"
            style={{
              ...styles.resultCardBase,
              border: `1px solid ${
                result.status === 'success'
                  ? 'rgba(16, 185, 129, 0.3)'
                  : 'rgba(245, 158, 11, 0.3)'
              }`,
            }}
          >
            <div style={styles.resultTop}>
              <div style={styles.resultTopRow}>
                <div>
                  <div style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: '0.08em', display: 'inline-block',
                    marginBottom: '8px',
                    background: result.status === 'success' ? 'rgba(163,163,163,0.1)' : 'rgba(128,128,128,0.1)',
                    color: result.status === 'success' ? '#a3a3a3' : '#808080',
                    border: `1px solid ${result.status === 'success' ? 'rgba(163,163,163,0.2)' : 'rgba(128,128,128,0.2)'}`,
                  }}>
                    {result.status === 'success' ? '✓ Check-in Successful' : '⚠ Already Checked In'}
                  </div>
                  <h2 style={styles.resultTitle}>
                    {result.student.student_name}
                  </h2>
                  <p style={styles.resultMeta}>
                    {result.student.register_no} · {result.student.school} · {result.student.branch || result.student.program}
                  </p>
                </div>
                <div style={{
                  background: 'var(--bg-card-highlight)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  textAlign: 'center',
                  minWidth: '100px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}>
                  <p style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: '4px',
                  }}>
                    Assigned Seat
                  </p>
                  <p style={{
                    fontSize: '1.4rem',
                    fontWeight: 900,
                    color: 'var(--text-primary)',
                    fontFamily: 'monospace',
                  }}>
                    {seatLabel(result.student)}
                  </p>
                </div>
              </div>
            </div>

            <div style={styles.resultBody}>
              {result.student.awards.length > 0 && (
                <div>
                  <p style={styles.label}>
                    Awards
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {result.student.awards.map((a, i) => (
                      <span key={`${a.type}-${i}`} style={{
                        padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600,
                        background: a.type === 'merit' ? 'rgba(136,136,136,0.1)' : 'rgba(153,153,153,0.1)',
                        color: a.type === 'merit' ? '#888888' : '#999999',
                        border: `1px solid ${a.type === 'merit' ? 'rgba(136,136,136,0.2)' : 'rgba(153,153,153,0.2)'}`,
                        textTransform: 'uppercase', letterSpacing: '0.04em'
                      }}>
                        {a.type}: {a.details}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.seatMap && result.student.seating_category !== 'gallery' && result.student.seat?.type?.toLowerCase() !== 'gallery' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <p style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        Section Map {result.seatMap.section}
                      </p>
                      <p style={{ marginTop: '2px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Blue marks this student&apos;s seat. Green means already present.
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-info">Target seat</span>
                      <span className="badge badge-success">Checked in</span>
                    </div>
                  </div>

                  <div style={styles.seatMapWrap}>
                    <div style={styles.seatMapInner}>
                      {result.seatMap.rows.map((row) => (
                        <div key={row.row} style={styles.seatMapRow}>
                          <div style={styles.seatRowLabel}>
                            {row.row}
                          </div>
                          <div style={styles.seatGroup}>
                            {row.seats.map((seat) => (
                              <div
                                key={seat.key}
                                className={seat.student?.register_no === result.student.register_no ? 'seat-cell' : seatToneMap[seat.state]}
                                style={seat.student?.register_no === result.student.register_no ? {
                                  background: 'rgba(96, 165, 250, 0.2)',
                                  border: '2px solid var(--info)',
                                  color: 'var(--info)',
                                  boxShadow: '0 0 0 2px rgba(96, 165, 250, 0.12)',
                                } : undefined}
                                title={seat.key}
                              >
                                {seat.column}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setResult(null);
                  setError('');
                }}
                className="btn-secondary"
                style={styles.resultFooterButton}
              >
                Ready for Next Student
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
