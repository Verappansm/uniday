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

interface BarcodeResult {
  rawValue?: string;
}

interface BarcodeDetectorLike {
  detect(source: HTMLCanvasElement): Promise<BarcodeResult[]>;
}

interface BarcodeDetectorConstructor {
  new (options: { formats: string[] }): BarcodeDetectorLike;
}

const seatToneMap: Record<SeatMap['rows'][number]['seats'][number]['state'], string> = {
  empty: 'seat-cell seat-empty',
  reserved: 'seat-cell seat-reserved',
  checked_in: 'seat-cell seat-checked-in',
  rsvp_yes: 'seat-cell seat-rsvp-yes',
  rsvp_no: 'seat-cell seat-rsvp-no',
};

function seatLabel(student: Student) {
  if (student.seating_category === 'gallery') return 'Gallery';
  if (student.seat?.section) return `${student.seat.section}-${student.seat.row}${student.seat.column}`;
  return 'N/A';
}

function statusBadgeClasses(status: CheckInResult['status']) {
  return status === 'success'
    ? 'badge badge-success'
    : 'badge badge-warning';
}

export default function VolunteerPage() {
  const [mode, setMode] = useState<'scan' | 'search'>('scan');
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [searching, setSearching] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const resetFeedback = () => {
    setError('');
    setResult(null);
  };

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setScanning(true);

      const barcodeWindow = window as Window & typeof globalThis & {
        BarcodeDetector?: BarcodeDetectorConstructor;
      };

      if (barcodeWindow.BarcodeDetector) {
        const detector = new barcodeWindow.BarcodeDetector({ formats: ['qr_code'] });
        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || !canvasRef.current) return;

          const canvas = canvasRef.current;
          const context = canvas.getContext('2d');
          if (!context) return;

          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          context.drawImage(videoRef.current, 0, 0);

          try {
            const barcodes = await detector.detect(canvas);
            const value = barcodes[0]?.rawValue;

            if (value) {
              stopScanner();
              handleCheckin(value);
            }
          } catch {
            // Keep scanning.
          }
        }, 500);
      } else {
        setError('Barcode scanning is not supported on this browser. Use manual token or search.');
      }
    } catch {
      setError('Camera access denied. Use manual search instead.');
    }
  };

  useEffect(() => () => stopScanner(), []);

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_30%),linear-gradient(180deg,#090910_0%,#0d0d16_100%)] px-4 py-5 text-[var(--text-primary)] sm:px-6">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <section className="glass-card overflow-hidden border-[var(--border-accent)]">
          <div className="border-b border-[var(--border-subtle)] bg-white/5 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
                  Event Day Check-In
                </p>
                <h1 className="mt-1 text-3xl font-black tracking-tight">
                  <span className="gradient-text">Volunteer Dashboard</span>
                </h1>
                <p className="mt-2 max-w-sm text-sm text-[var(--text-secondary)]">
                  Scan the QR, search a student manually, and verify seat details before directing them.
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="btn-secondary shrink-0 px-4 py-2 text-sm"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 px-4 py-4">
            <button
              onClick={() => {
                setMode('scan');
                resetFeedback();
              }}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                mode === 'scan'
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-glow)] text-[var(--text-primary)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)]'
              }`}
            >
              <p className="text-sm font-bold">QR Scan</p>
              <p className="mt-1 text-xs text-inherit/80">Use camera or pasted token</p>
            </button>
            <button
              onClick={() => {
                setMode('search');
                stopScanner();
                resetFeedback();
              }}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                mode === 'search'
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-glow)] text-[var(--text-primary)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)]'
              }`}
            >
              <p className="text-sm font-bold">Manual Search</p>
              <p className="mt-1 text-xs text-inherit/80">Find by name or register number</p>
            </button>
          </div>
        </section>

        {mode === 'scan' && (
          <section className="glass-card fade-in p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Scanner</h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  Point the camera at the student&apos;s QR code.
                </p>
              </div>
              <span className={scanning ? 'badge badge-success' : 'badge badge-info'}>
                {scanning ? 'Live camera' : 'Camera idle'}
              </span>
            </div>

            <div className="rounded-3xl border border-dashed border-[var(--border-accent)] bg-[rgba(255,255,255,0.02)] p-3">
              {!scanning ? (
                <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.02)] px-6 py-10 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-glow)] text-3xl">
                    QR
                  </div>
                  <p className="text-base font-semibold">Ready to start scanning</p>
                  <p className="mt-2 max-w-xs text-sm text-[var(--text-secondary)]">
                    Use the back camera for faster detection. If scanning is not supported, paste the QR token below.
                  </p>
                  <button
                    onClick={startScanner}
                    className="btn-primary mt-5 w-full max-w-xs"
                    disabled={checkingIn}
                  >
                    Start Camera
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <video
                    ref={videoRef}
                    className="max-h-[360px] w-full rounded-2xl border border-[var(--border-subtle)] bg-black object-cover"
                    playsInline
                    muted
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-[rgba(255,255,255,0.03)] px-4 py-3">
                    <p className="text-sm text-[var(--text-secondary)]">
                      Scanning continuously every 0.5 seconds.
                    </p>
                    <button onClick={stopScanner} className="btn-danger px-4 py-2 text-sm">
                      Stop Camera
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.02)] p-4">
              <p className="text-sm font-semibold">Manual QR token</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Paste the raw token if the QR cannot be scanned.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  className="input-field"
                  placeholder="Paste QR token"
                  value={manualToken}
                  onChange={(event) => setManualToken(event.target.value)}
                />
                <button
                  onClick={() => manualToken.trim() && handleCheckin(manualToken.trim())}
                  className="btn-primary whitespace-nowrap sm:w-auto"
                  disabled={checkingIn || !manualToken.trim()}
                >
                  {checkingIn ? 'Checking…' : 'Check In'}
                </button>
              </div>
            </div>
          </section>
        )}

        {mode === 'search' && (
          <section className="glass-card fade-in p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="text-lg font-bold">Manual Search</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Search by student name or register number, then mark attendance manually.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className="input-field"
                placeholder="Search by name or register number"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                className="btn-primary whitespace-nowrap sm:w-auto"
                disabled={searching || !searchQuery.trim()}
              >
                {searching ? 'Searching…' : 'Search'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="mt-4 space-y-3">
                {searchResults.map((student) => (
                  <div
                    key={student._id || student.register_no}
                    className="rounded-2xl border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.03)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-bold">{student.student_name}</p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {student.register_no}
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                          {student.school} · {student.branch || student.program}
                        </p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                          Seat {seatLabel(student)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCheckin(undefined, student.register_no)}
                        className={student.checked_in ? 'btn-secondary px-4 py-2 text-sm' : 'btn-success px-4 py-2 text-sm'}
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
          <section className="fade-in rounded-2xl border border-red-500/30 bg-[var(--danger-glow)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
            {error}
          </section>
        )}

        {result && (
          <section
            className={`glass-card fade-in overflow-hidden border ${
              result.status === 'success'
                ? 'border-emerald-500/30'
                : 'border-amber-500/30'
            }`}
          >
            <div className="border-b border-[var(--border-subtle)] px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className={statusBadgeClasses(result.status)}>
                    {result.status === 'success' ? 'Checked in' : 'Already checked in'}
                  </div>
                  <h2 className="mt-3 text-2xl font-black tracking-tight">
                    {result.student.student_name}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {result.student.register_no} · {result.student.school} · {result.student.branch || result.student.program}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-center">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    Seat
                  </p>
                  <p className="mt-1 text-xl font-black text-[var(--accent-secondary)]">
                    {seatLabel(result.student)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5 px-5 py-5">
              {result.student.awards.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">
                    Awards
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.student.awards.map((award, index) => (
                      <span key={`${award.type}-${award.details}-${index}`} className="badge badge-accent">
                        {award.type}: {award.details}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.seatMap && (
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-secondary)]">
                        Section Map {result.seatMap.section}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Blue marks this student&apos;s seat. Green means already present.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[0.7rem] text-[var(--text-muted)]">
                      <span className="badge badge-info">Target seat</span>
                      <span className="badge badge-success">Checked in</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.02)] p-3">
                    <div className="flex min-w-max flex-col gap-2">
                      {result.seatMap.rows.map((row) => (
                        <div key={row.row} className="flex items-center gap-2">
                          <div className="w-5 text-center text-xs font-semibold text-[var(--text-muted)]">
                            {row.row}
                          </div>
                          <div className="flex gap-1.5">
                            {row.seats.map((seat) => (
                              <div
                                key={seat.key}
                                className={
                                  seat.student?.register_no === result.student.register_no
                                    ? 'seat-cell seat-rsvp-yes'
                                    : seatToneMap[seat.state]
                                }
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
                className="btn-secondary w-full"
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
