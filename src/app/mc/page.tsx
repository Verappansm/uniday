'use client';

import { useState, useEffect, useCallback } from 'react';
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
}

export default function MCPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [showOnly, setShowOnly] = useState<'all' | 'checked_in' | 'absent'>('all');
  const [view, setView] = useState<'list' | 'seating'>('list');
  const [totalStudents, setTotalStudents] = useState(0);
  const [page, setPage] = useState(1);
  const router = useRouter();

  const fetchStudents = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (showOnly === 'checked_in') params.set('checked_in', 'true');
      if (showOnly === 'absent') params.set('checked_in', 'false');
      params.set('page', String(page));
      params.set('limit', '100');

      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();
      setStudents(data.users);
      setTotalStudents(data.total);
    } catch (err) {
      console.error(err);
    }
  }, [showOnly, page]);

  useEffect(() => {
    fetchStudents();
    const interval = setInterval(fetchStudents, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, [fetchStudents]);

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
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', maxWidth: '1200px', margin: '0 auto 24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            <span className="gradient-text">MC Panel</span>
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Certificate Ceremony Order · {totalStudents} students
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div className="pulse-dot" style={{ background: 'var(--success)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Live</span>
          <button onClick={handleLogout} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem', marginLeft: '12px' }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {[
            { id: 'all' as const, label: 'All', icon: '👥' },
            { id: 'checked_in' as const, label: 'Present', icon: '✅' },
            { id: 'absent' as const, label: 'Absent', icon: '❌' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => { setShowOnly(f.id); setPage(1); }}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: `2px solid ${showOnly === f.id ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                background: showOnly === f.id ? 'var(--accent-glow)' : 'var(--bg-card)',
                color: showOnly === f.id ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {f.icon} {f.label}
            </button>
          ))}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setView('list')}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: `2px solid ${view === 'list' ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                background: view === 'list' ? 'var(--accent-glow)' : 'var(--bg-card)',
                color: view === 'list' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              📋 List
            </button>
            <button
              onClick={() => setView('seating')}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: `2px solid ${view === 'seating' ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                background: view === 'seating' ? 'var(--accent-glow)' : 'var(--bg-card)',
                color: view === 'seating' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              💺 Seating
            </button>
          </div>
        </div>

        {/* List View */}
        {view === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {students.map((s, idx) => (
              <div
                key={s._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px 20px',
                  background: s.checked_in ? 'var(--bg-card)' : 'var(--bg-primary)',
                  borderRadius: '12px',
                  border: `1px solid ${s.checked_in ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-subtle)'}`,
                  opacity: !s.checked_in && showOnly === 'all' ? 0.5 : 1,
                  transition: 'all 0.3s ease',
                }}
              >
                {/* Index */}
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: s.checked_in ? 'var(--success-glow)' : 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  color: s.checked_in ? 'var(--success)' : 'var(--text-muted)',
                  border: `1px solid ${s.checked_in ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`,
                  flexShrink: 0,
                }}>
                  {(page - 1) * 100 + idx + 1}
                </div>

                {/* Student info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>{s.student_name}</span>
                    {s.awards.length > 1 && (
                      <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Multi-Award</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {s.register_no} · {s.school} · {s.branch}
                  </div>
                </div>

                {/* Awards */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '300px' }}>
                  {s.awards.map((a, i) => (
                    <span key={i} className={`badge badge-${a.type === 'merit' ? 'warning' : a.type === 'bogs' ? 'accent' : 'info'}`} style={{ fontSize: '0.7rem' }}>
                      {a.type}: {a.details}
                    </span>
                  ))}
                </div>

                {/* Seat */}
                <div style={{
                  padding: '8px 14px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: 'var(--accent-secondary)',
                  flexShrink: 0,
                }}>
                  {seatLabel(s)}
                </div>

                {/* Status indicator */}
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: s.checked_in ? 'var(--success)' : 'var(--danger)',
                  flexShrink: 0,
                  boxShadow: s.checked_in ? '0 0 8px var(--success-glow)' : 'none',
                }} />
              </div>
            ))}
          </div>
        )}

        {/* Seating View */}
        {view === 'seating' && (
          <div>
            <div style={{
              textAlign: 'center',
              padding: '12px 40px',
              background: 'linear-gradient(135deg, var(--accent-primary), #7c3aed)',
              borderRadius: '12px',
              marginBottom: '20px',
              fontWeight: 700,
              fontSize: '0.9rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              🎤 STAGE
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {['S1', 'S2', 'S3', 'S4'].map((section) => {
                const sectionStudents = students.filter(
                  (s) => s.seat?.section === section
                );
                return (
                  <div key={section} className="glass-card" style={{ padding: '16px' }}>
                    <h3 style={{ textAlign: 'center', marginBottom: '8px', fontWeight: 700, color: 'var(--accent-secondary)', fontSize: '0.9rem' }}>
                      Section {section.replace('S', '')}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {sectionStudents.map((s) => (
                        <div
                          key={s._id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: s.checked_in ? 'var(--success-glow)' : 'transparent',
                            fontSize: '0.75rem',
                            opacity: s.checked_in ? 1 : 0.4,
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>{s.student_name}</span>
                          <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                            {seatLabel(s)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
          <button className="btn-secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            Previous
          </button>
          <span style={{ padding: '8px 16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Page {page} of {Math.ceil(totalStudents / 100)}
          </span>
          <button className="btn-secondary" onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(totalStudents / 100)} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
