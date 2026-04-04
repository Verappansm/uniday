'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Student {
  _id: string;
  register_no: string;
  student_name: string;
  school: string;
  program: string;
  branch: string;
  batch: string;
  awards: { type: string; details: string }[];
  checked_in: boolean;
  seat?: { section: string; row: string; column: number; type: string };
  seating_category: string;
  rsvp_status: string | null;
  upload_order: number;
}

function getSeatLabel(s: Student): string {
  if (s.seating_category === 'gallery') return 'Gallery';
  if (s.seat?.section) return `${s.seat.section}-${s.seat.row}${s.seat.column}`;
  return '—';
}

function getProgramBranch(student: Student): string {
  return [student.program, student.branch].filter(Boolean).join(' / ') || '—';
}

function getSeatSortValue(student: Student): [number, number, number] {
  if (!student.seat?.section || !student.seat?.row || !student.seat?.column) {
    return [999, 999, 999];
  }

  const sectionMatch = String(student.seat.section).match(/\d+/);
  const sectionIndex = sectionMatch ? Number(sectionMatch[0]) : 999;
  const row = String(student.seat.row).toUpperCase();
  const column = Number(student.seat.column) || 999;
  const rowOrder = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'A'];
  const rowIndex = rowOrder.indexOf(row);

  return [sectionIndex, rowIndex === -1 ? 999 : rowIndex, column];
}

function getRankText(student: Student): string {
  const meritAward = student.awards.find((award) => award.type.toLowerCase() === 'merit');
  return meritAward?.details || student.awards[0]?.details || '—';
}

function getAwardText(student: Student): string {
  return student.awards.map((award) => award.type).join(', ') || '—';
}

const ROWS = 'ABCDEFGHIJKLMNO'.split('');
const COLS = Array.from({ length: 10 }, (_, i) => i + 1);
const SECTIONS = ['S1', 'S2', 'S3', 'S4'];

export default function MCPage() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [seatStudents, setSeatStudents] = useState<Student[]>([]);
  const [filter, setFilter] = useState<'all' | 'checked_in' | 'absent'>('all');
  const [view, setView] = useState<'list' | 'seating'>('list');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedSeat, setSelectedSeat] = useState<Student | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const presentCount = students.filter((s) => s.checked_in).length;
  const absentCount = students.filter((s) => !s.checked_in).length;

  useEffect(() => {
    const verifyRole = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (!res.ok || (data.role !== 'mc' && data.role !== 'admin')) {
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

  const fetchStudents = useCallback(async () => {
    try {
      const params = new URLSearchParams({ sort: 'seating', limit: '0', category: 'ground' });
      if (filter === 'checked_in') params.set('checked_in', 'true');
      if (filter === 'absent') params.set('checked_in', 'false');
      const res = await fetch(`/api/users?${params}`);
      if (res.status === 401 || res.status === 403) { router.push('/login'); return; }
      const data = await res.json();
      setStudents(data.users ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filter, router]);

  const fetchSeating = useCallback(async () => {
    try {
      const params = new URLSearchParams({ category: 'ground' });
      if (filter === 'checked_in') params.set('checked_in', 'true');
      else if (filter === 'absent') params.set('checked_in', 'false');
      const res = await fetch(`/api/seating?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setSeatStudents(data.students ?? []);
    } catch (e) { console.error(e); }
  }, [filter]);

  useEffect(() => {
    if (!authChecked) return;
    fetchStudents();
    const id = setInterval(fetchStudents, 10000);
    return () => clearInterval(id);
  }, [authChecked, fetchStudents]);

  useEffect(() => {
    if (authChecked && view === 'seating') {
      fetchSeating();
      const id = setInterval(fetchSeating, 10000);
      return () => clearInterval(id);
    }
  }, [authChecked, view, filter, fetchSeating]);

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const displayedStudents = [...students]
    .filter((s) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return s.student_name.toLowerCase().includes(q) || s.register_no.toLowerCase().includes(q);
    });

  const seatMap = new Map<string, Student>();
  seatStudents.forEach((s) => {
    if (s.seat?.section && s.seat?.row && s.seat?.column)
      seatMap.set(`${s.seat.section}-${s.seat.row}${s.seat.column}`, s);
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>

      {/* ── HEADER ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(13,13,13,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '14px 24px' }}>

          {/* Row 1: title + stats + logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                MC Panel
              </span>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '20px', fontSize: '0.8rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: '6px 14px', borderRadius: '10px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 6px var(--success-glow)' }} />
                Present: <strong style={{ color: 'var(--success)', marginLeft: '2px' }}>{presentCount}</strong>
              </span>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--warning)', boxShadow: '0 0 6px var(--warning-glow)' }} />
                Absent: <strong style={{ color: 'var(--warning)', marginLeft: '2px' }}>{absentCount}</strong>
              </span>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)' }} />
                Total Ground: <strong style={{ color: 'var(--text-secondary)', marginLeft: '2px' }}>{students.length}</strong>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={handleLogout}
                style={{
                  background: 'none', border: '1px solid var(--border-subtle)',
                  borderRadius: '8px', color: 'var(--text-muted)', padding: '5px 14px',
                  fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
              >
                Logout
              </button>
            </div>
          </div>

          {/* Row 2: filter + search + view */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Filter */}
            <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '3px' }}>
              {(['all', 'checked_in', 'absent'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setSearch(''); }}
                  style={{
                    padding: '6px 12px', borderRadius: '6px', border: 'none',
                    fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                    background: filter === f ? 'var(--bg-card-hover)' : 'transparent',
                    color: filter === f ? 'var(--text-primary)' : 'var(--text-muted)',
                    transition: 'all 0.1s',
                  }}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name or reg no…"
                  style={{
                    width: '240px', padding: '7px 12px 7px 32px', fontSize: '0.75rem',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
                    borderRadius: '8px', color: 'var(--text-primary)',
                    outline: 'none', transition: 'all 0.15s',
                  }}
                />
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>⌕</span>
              </div>

            {/* View toggle */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '3px' }}>
              {(['list', 'seating'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    padding: '6px 12px', borderRadius: '6px', border: 'none',
                    fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                    background: view === v ? 'var(--bg-card-hover)' : 'transparent',
                    color: view === v ? 'var(--text-primary)' : 'var(--text-muted)',
                    transition: 'all 0.1s',
                  }}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px 24px' }}>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', color: '#444', fontSize: '0.85rem', letterSpacing: '0.06em' }}>
            Loading…
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {!loading && view === 'list' && (
          <div>
            {displayedStudents.length === 0 && (
              <div style={{ textAlign: 'center', color: '#444', padding: '60px 0', fontSize: '0.85rem' }}>
                No students match.
              </div>
            )}

            {/* Table header */}
            {displayedStudents.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(170px, 1.05fr) minmax(220px, 1.25fr) 90px minmax(260px, 1.5fr) 70px 140px 140px 120px 100px',
                gap: '0 16px',
                padding: '6px 12px',
                borderBottom: '1px solid #1e1e1e',
                marginBottom: '4px',
              }}>
                {['School', 'Program / Branch', 'Batch', 'Name', '', 'Award', 'Rank', 'Seating Order', 'Attendance'].map((h) => (
                  <span key={h} style={{ fontSize: '0.68rem', fontWeight: 600, color: '#444', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</span>
                ))}
              </div>
            )}

            {displayedStudents.map((s) => {
              const present = s.checked_in;
              const multi = s.awards.length > 1;
              return (
                <div
                  key={s._id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(170px, 1.05fr) minmax(220px, 1.25fr) 90px minmax(260px, 1.5fr) 70px 140px 140px 120px 100px',
                    gap: '0 16px',
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    borderBottom: '1px solid #161616',
                    opacity: !present && filter === 'all' ? 0.38 : 1,
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#141414'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: '0.82rem', color: present ? '#d4d4d4' : '#8a8a8a' }}>
                    {s.school || '—'}
                  </span>

                  <div style={{ fontSize: '0.82rem', color: present ? '#d4d4d4' : '#8a8a8a' }}>
                    {getProgramBranch(s)}
                  </div>

                  <div style={{ fontSize: '0.82rem', color: present ? '#d4d4d4' : '#8a8a8a' }}>
                    {s.batch || '—'}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: present ? '#fff' : '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.student_name}
                      </span>
                      {multi && (
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '1px 5px', whiteSpace: 'nowrap' }}>
                          multi
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.register_no}
                    </div>
                  </div>

                  <div />

                  <div style={{ fontSize: '0.78rem', color: present ? 'var(--text-primary)' : 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {getAwardText(s)}
                  </div>

                  <div style={{ fontSize: '0.8rem', color: present ? 'var(--text-secondary)' : 'var(--text-muted)', fontWeight: 600 }}>
                    {getRankText(s)}
                  </div>

                  <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: present ? 'var(--text-secondary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {getSeatLabel(s)}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    {present ? (
                      <span style={{ fontSize: '0.68rem', color: 'var(--success)', fontWeight: 600, letterSpacing: '0.04em' }}>Present</span>
                    ) : (
                      <span style={{ fontSize: '0.68rem', color: 'var(--danger)', fontWeight: 600, letterSpacing: '0.04em' }}>Absent</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── SEATING MAP VIEW ── */}
        {!loading && view === 'seating' && (
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', width: '100%', minWidth: 0 }}>

            {/* Map area */}
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              {/* Stage */}
              <div style={{
                textAlign: 'center', marginBottom: '20px',
                padding: '10px 0', background: '#171717',
                border: '1px solid #222', borderRadius: '8px',
                fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.15em',
                textTransform: 'uppercase', color: '#555',
              }}>
                Stage / Screen
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {[
                  { label: 'Empty', bg: 'transparent', border: 'var(--border-subtle)', color: 'var(--text-muted)' },
                  { label: 'Reserved', bg: 'var(--warning-glow)', border: 'var(--warning)', color: 'var(--warning)' },
                  { label: 'Present', bg: 'var(--success)', border: 'var(--success)', color: '#000' },
                ].map(({ label, bg, border, color }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: bg, border: `1px solid ${border}`, boxShadow: label === 'Present' ? '0 0 8px var(--success-glow)' : 'none' }} />
                    {label}
                  </div>
                ))}
              </div>

              {/* 4 sections horizontal scroll */}
              <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', overflowY: 'hidden', paddingBottom: '12px', width: '100%' }}>
                {SECTIONS.map((section) => (
                  <div key={section} style={{
                    background: '#111', border: '1px solid #1e1e1e', minWidth: '380px', flexShrink: 0,
                    borderRadius: '10px', padding: '16px', overflowX: 'auto',
                  }}>
                    <div style={{
                      textAlign: 'center', marginBottom: '12px',
                      fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em',
                      textTransform: 'uppercase', color: '#3a3a3a',
                    }}>
                      {section}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center' }}>
                      {ROWS.map((row) => (
                        <div key={row} style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                          <span style={{ width: '20px', textAlign: 'center', fontSize: '0.65rem', color: '#3a3a3a', fontWeight: 600, flexShrink: 0 }}>
                            {row}
                          </span>
                          {COLS.map((col: number) => {
                            const key = `${section}-${row}${col}`;
                            const student = seatMap.get(key) ?? null;
                            const present = student?.checked_in ?? false;
                            const occupied = !!student;
                            const isSelected = selectedSeat?._id === student?._id && !!student;
                            const isSearchMatch = search.trim().length > 0 && !!student && (
                              student.student_name.toLowerCase().includes(search.toLowerCase()) ||
                              student.register_no.toLowerCase().includes(search.toLowerCase())
                            );

                            let bg = 'var(--bg-secondary)';
                            let borderColor = 'var(--border-subtle)';
                            let color = 'var(--text-muted)';

                            if (present) {
                              bg = 'var(--success)';
                              borderColor = 'var(--success)';
                              color = '#000';
                            } else if (occupied) {
                              if (student.rsvp_status === 'yes') {
                                bg = 'var(--info-glow)';
                                borderColor = 'var(--info)';
                                color = 'var(--info)';
                              } else if (student.rsvp_status === 'no') {
                                bg = 'var(--danger-glow)';
                                borderColor = 'var(--danger)';
                                color = 'var(--danger)';
                              } else {
                                bg = 'var(--warning-glow)';
                                borderColor = 'var(--warning)';
                                color = 'var(--warning)';
                              }
                            }

                            if (isSelected) {
                              borderColor = 'var(--accent-primary)';
                              color = present ? '#000' : 'var(--text-primary)';
                            } else if (isSearchMatch) {
                              borderColor = 'var(--accent-secondary)';
                              bg = 'var(--accent-glow)';
                            }

                            return (
                              <div
                                key={col}
                                onClick={() => {
                                  if (!student) return;
                                  setSelectedSeat((prev) => prev?._id === student._id ? null : student);
                                }}

                                style={{
                                  width: '36px', height: '36px', borderRadius: '6px',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: bg,
                                  border: `2px solid ${borderColor}`,
                                  color,
                                  fontSize: '0.65rem', fontWeight: 700,
                                  cursor: occupied ? 'pointer' : 'default',
                                  transition: 'all 0.1s',
                                  boxShadow: isSelected
                                    ? '0 0 0 2px rgba(255,255,255,0.15)'
                                    : present ? '0 0 12px var(--success-glow)' : isSearchMatch ? '0 0 12px var(--info)' : 'none',
                                  transform: isSelected ? 'scale(1.15)' : isSearchMatch ? 'scale(1.1)' : 'scale(1)',
                                  position: 'relative',
                                  zIndex: isSelected ? 10 : isSearchMatch ? 5 : 'auto',
                                }}
                              >
                                {col}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── DETAILS PANEL ── */}
            <div style={{
              width: selectedSeat ? '300px' : '0',
              flexShrink: 0,
              opacity: selectedSeat ? 1 : 0,
              overflow: 'hidden',
              transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.22s ease',
              background: 'var(--bg-card)',
              borderLeft: selectedSeat ? '1px solid var(--border-subtle)' : 'none',
              borderRadius: '0 0 0 0',
            }}>
              {/* Panel header */}
              <div style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--border-subtle)',
                fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--text-muted)',
              }}>
                Seat Details
              </div>

              {selectedSeat && (
                (() => {
                  const s = selectedSeat;
                  const accentColor = s.checked_in ? 'var(--success)' : 'var(--warning)';
                  const accentGlow = s.checked_in ? 'var(--success-glow)' : 'var(--warning-glow)';
                  return (
                    <div style={{ padding: '18px' }}>
                      {/* Status bar */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        marginBottom: '16px', paddingBottom: '14px',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}>
                        <span style={{
                          width: '8px', height: '8px', borderRadius: '50%',
                          background: accentColor, display: 'inline-block', flexShrink: 0,
                          boxShadow: `0 0 8px ${accentGlow}`,
                        }} />
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: accentColor, letterSpacing: '0.06em' }}>
                          {s.checked_in ? 'Present' : 'Not arrived'}
                        </span>
                        {selectedSeat && (
                          <button
                            onClick={() => setSelectedSeat(null)}
                            style={{
                              marginLeft: 'auto', background: 'none', border: 'none',
                              color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem',
                              lineHeight: 1, padding: '0 8px', transition: 'color 0.1s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                            title="Deselect"
                          >×</button>
                        )}
                      </div>

                      {/* Name */}
                      <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '4px', lineHeight: 1.3 }}>
                        {s.student_name}
                      </p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: '12px' }}>
                        {s.register_no}
                      </p>

                      {/* Meta rows */}
                      {[
                        { label: 'School', val: s.school },
                        { label: 'Branch', val: s.branch },
                        { label: 'Seat', val: getSeatLabel(s) },
                      ].map(({ label, val }) => (
                        <div key={label} style={{
                          display: 'flex', justifyContent: 'space-between',
                          alignItems: 'flex-start', gap: '8px',
                          padding: '7px 0', borderBottom: '1px solid var(--border-subtle)',
                        }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>{label}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'right', wordBreak: 'break-word', fontFamily: label === 'Seat' ? 'monospace' : 'inherit' }}>{val}</span>
                        </div>
                      ))}

                      {/* Awards */}
                      {s.awards.length > 0 && (
                        <div style={{ marginTop: '14px' }}>
                          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Awards</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {s.awards.map((a, i) => (
                              <div key={i} style={{
                                background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
                                borderRadius: '6px', padding: '7px 10px',
                              }}>
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'capitalize', display: 'block', marginBottom: '1px' }}>{a.type}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{a.details}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        )}
      </div>

      {/* tooltip removed — details panel handles selection */}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  );
}
