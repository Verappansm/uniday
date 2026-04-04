'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Student {
  _id: string;
  register_no: string;
  student_name: string;
  school: string;
  branch: string;
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
      const params = new URLSearchParams({ sort: 'upload_order', limit: '0' });
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

  const displayedStudents = students.filter((s) => {
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
    <div style={{ minHeight: '100vh', background: '#0d0d0d', color: '#e2e2e2', fontFamily: 'Inter, sans-serif' }}>

      {/* ── HEADER ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(13,13,13,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #1e1e1e',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '14px 24px' }}>

          {/* Row 1: title + stats + logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', letterSpacing: '-0.01em' }}>
                MC Panel
              </span>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '20px', fontSize: '0.8rem', background: '#171717', border: '1px solid #222', padding: '6px 14px', borderRadius: '10px' }}>
              <span style={{ color: '#555', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }} />
                <span>Total <strong style={{ color: '#e2e2e2' }}>{students.length}</strong></span>
              </span>
              <span style={{ color: '#555', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px rgba(16,185,129,0.4)' }} />
                <span>Present <strong style={{ color: '#10b981' }}>{presentCount}</strong></span>
              </span>
              <span style={{ color: '#555', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f43f5e' }} />
                <span>Absent <strong style={{ color: '#e2e2e2' }}>{absentCount}</strong></span>
              </span>
            </div>

            {/* Live indicator */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '4px 10px', background: 'rgba(74,222,128,0.05)',
              border: '1px solid rgba(74,222,128,0.2)', borderRadius: '20px',
              marginLeft: 'auto'
            }}>
              <span className="pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#4ade80', letterSpacing: '0.04em' }}>LIVE</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={handleLogout}
                style={{
                  background: 'none', border: '1px solid #2a2a2a',
                  borderRadius: '8px', color: '#888', padding: '5px 14px',
                  fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#444'; (e.currentTarget as HTMLElement).style.color = '#ccc'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#2a2a2a'; (e.currentTarget as HTMLElement).style.color = '#888'; }}
              >
                Logout
              </button>
            </div>
          </div>

          {/* Row 2: filter + search + view */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Filter */}
            <div style={{ display: 'flex', gap: '2px', background: '#171717', border: '1px solid #222', borderRadius: '8px', padding: '3px' }}>
              {(['all', 'checked_in', 'absent'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setSearch(''); }}
                  style={{
                    padding: '5px 14px', borderRadius: '6px',
                    border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500,
                    fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                    background: filter === f ? '#262626' : 'transparent',
                    color: filter === f ? '#e2e2e2' : '#555',
                  }}
                >
                  {f === 'all' ? 'All' : f === 'checked_in' ? 'Present' : 'Absent'}
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
                    background: '#171717', border: '1px solid #222',
                    borderRadius: '8px', color: '#e2e2e2',
                    padding: '6px 12px 6px 32px', fontSize: '0.78rem',
                    fontFamily: 'Inter, sans-serif', outline: 'none', width: '240px',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#444'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#222'; }}
                />
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#444', fontSize: '0.8rem' }}>⌕</span>
              </div>

            {/* View toggle */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px', background: '#171717', border: '1px solid #222', borderRadius: '8px', padding: '3px' }}>
              {(['list', 'seating'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    padding: '5px 14px', borderRadius: '6px',
                    border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500,
                    fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                    background: view === v ? '#262626' : 'transparent',
                    color: view === v ? '#e2e2e2' : '#555',
                  }}
                >
                  {v === 'list' ? 'List' : 'Seating Map'}
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
                gridTemplateColumns: '44px 1fr 120px auto 80px',
                gap: '0 16px',
                padding: '6px 12px',
                borderBottom: '1px solid #1e1e1e',
                marginBottom: '4px',
              }}>
                {['#', 'Name', 'Awards', 'Seat', ''].map((h) => (
                  <span key={h} style={{ fontSize: '0.68rem', fontWeight: 600, color: '#444', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</span>
                ))}
              </div>
            )}

            {displayedStudents.map((s, idx) => {
              const present = s.checked_in;
              const multi = s.awards.length > 1;
              return (
                <div
                  key={s._id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '44px 1fr 120px auto 80px',
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
                  {/* # */}
                  <span style={{ fontSize: '0.75rem', color: '#3a3a3a', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {s.upload_order || idx + 1}
                  </span>

                  {/* Name + meta */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: present ? '#fff' : '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.student_name}
                      </span>
                      {multi && (
                        <span style={{ fontSize: '0.6rem', color: '#888', border: '1px solid #2e2e2e', borderRadius: '4px', padding: '1px 5px', whiteSpace: 'nowrap' }}>
                          multi
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#444', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.register_no} · {s.school} · {s.branch}
                    </div>
                  </div>

                  {/* Awards */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                    {s.awards.map((a, i) => (
                      <span key={i} style={{
                        fontSize: '0.62rem', color: '#666',
                        border: '1px solid #222', borderRadius: '4px',
                        padding: '1px 6px', whiteSpace: 'nowrap',
                      }}>
                        {a.type}
                      </span>
                    ))}
                  </div>

                  {/* Seat */}
                  <span style={{
                    fontFamily: 'monospace', fontSize: '0.78rem',
                    color: '#555', whiteSpace: 'nowrap',
                  }}>
                    {getSeatLabel(s)}
                  </span>

                  {/* Status */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {present ? (
                      <span style={{ fontSize: '0.68rem', color: '#4ade80', fontWeight: 600, letterSpacing: '0.04em' }}>Present</span>
                    ) : (
                      <span style={{ fontSize: '0.68rem', color: '#333', fontWeight: 500 }}>—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── SEATING MAP VIEW ── */}
        {!loading && view === 'seating' && (
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

            {/* Map area */}
            <div style={{ flex: 1, minWidth: 0 }}>
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
                  { label: 'Empty', bg: '#242424', border: '#3a3a3a', color: '#666' },
                  { label: 'Absent', bg: '#3d1616', border: '#aa2222', color: '#f87171' },
                  { label: 'Present', bg: '#0c2e1a', border: '#2d8a4e', color: '#4ade80' },
                ].map(({ label, bg, border, color }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: bg, border: `1px solid ${border}` }} />
                    {label}
                  </div>
                ))}
              </div>

              {/* 2×2 section grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {SECTIONS.map((section) => (
                  <div key={section} style={{
                    background: '#111', border: '1px solid #1e1e1e', minWidth: 0,
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

                            let bg = '#171717';
                            let borderColor = '#222';
                            let color = '#333';

                            if (present) {
                              bg = '#10b981';
                              borderColor = '#10b981';
                              color = '#062016';
                            } else if (occupied) {
                              if (student.rsvp_status === 'yes') {
                                bg = 'rgba(59, 130, 246, 0.05)';
                                borderColor = 'rgba(59, 130, 246, 0.3)';
                                color = '#3b82f6';
                              } else if (student.rsvp_status === 'no') {
                                bg = 'rgba(244, 63, 94, 0.05)';
                                borderColor = 'rgba(244, 63, 94, 0.3)';
                                color = '#f43f5e';
                              } else {
                                bg = 'rgba(245, 158, 11, 0.05)';
                                borderColor = 'rgba(245, 158, 11, 0.3)';
                                color = '#f59e0b';
                              }
                            }

                            if (isSelected) {
                              borderColor = '#fff';
                              color = present ? '#062016' : '#fff';
                            } else if (isSearchMatch) {
                              borderColor = '#6366f1';
                              bg = 'rgba(99, 102, 241, 0.15)';
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
                                    : present ? '0 0 12px rgba(16, 185, 129, 0.4)' : isSearchMatch ? '0 0 12px #6366f1' : 'none',
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
              position: 'sticky', top: '120px',
              background: '#111', border: selectedSeat ? '1px solid #1e1e1e' : 'none',
              borderRadius: '12px',
            }}>
              {/* Panel header */}
              <div style={{
                padding: '14px 18px',
                borderBottom: '1px solid #1a1a1a',
                fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: '#3a3a3a',
              }}>
                Seat Details
              </div>

              {selectedSeat && (
                (() => {
                  const s = selectedSeat;
                  const accentColor = s.checked_in ? '#4ade80' : '#f87171';
                  return (
                    <div style={{ padding: '18px' }}>
                      {/* Status bar */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        marginBottom: '16px', paddingBottom: '14px',
                        borderBottom: '1px solid #1a1a1a',
                      }}>
                        <span style={{
                          width: '8px', height: '8px', borderRadius: '50%',
                          background: accentColor, display: 'inline-block', flexShrink: 0,
                        }} />
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: accentColor, letterSpacing: '0.06em' }}>
                          {s.checked_in ? 'Present' : 'Not arrived'}
                        </span>
                        {selectedSeat && (
                          <button
                            onClick={() => setSelectedSeat(null)}
                            style={{
                              marginLeft: 'auto', background: 'none', border: 'none',
                              color: '#666', cursor: 'pointer', fontSize: '1.2rem',
                              lineHeight: 1, padding: '0 8px', transition: 'color 0.1s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#eee')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
                            title="Deselect"
                          >×</button>
                        )}
                      </div>

                      {/* Name */}
                      <p style={{ fontWeight: 700, fontSize: '1rem', color: '#e2e2e2', marginBottom: '4px', lineHeight: 1.3 }}>
                        {s.student_name}
                      </p>
                      <p style={{ fontSize: '0.7rem', color: '#444', fontFamily: 'monospace', marginBottom: '12px' }}>
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
                          padding: '7px 0', borderBottom: '1px solid #161616',
                        }}>
                          <span style={{ fontSize: '0.68rem', color: '#3a3a3a', fontWeight: 600, flexShrink: 0 }}>{label}</span>
                          <span style={{ fontSize: '0.72rem', color: '#888', textAlign: 'right', wordBreak: 'break-word', fontFamily: label === 'Seat' ? 'monospace' : 'inherit' }}>{val}</span>
                        </div>
                      ))}

                      {/* Awards */}
                      {s.awards.length > 0 && (
                        <div style={{ marginTop: '14px' }}>
                          <p style={{ fontSize: '0.68rem', color: '#3a3a3a', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Awards</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {s.awards.map((a, i) => (
                              <div key={i} style={{
                                background: '#161616', border: '1px solid #222',
                                borderRadius: '6px', padding: '7px 10px',
                              }}>
                                <span style={{ fontSize: '0.68rem', color: '#666', textTransform: 'capitalize', display: 'block', marginBottom: '1px' }}>{a.type}</span>
                                <span style={{ fontSize: '0.75rem', color: '#aaa' }}>{a.details}</span>
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
