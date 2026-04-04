'use client';

import { useState, useEffect, use } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface Student {
  student_name: string;
  register_no: string;
  email: string;
  school: string;
  program: string;
  branch: string;
  batch: string;
  awards: { type: string; details: string }[];
  rsvp_status: string | null;
  seat?: { section: string; row: string; column: number; type: string };
  seating_category: string;
  qr_code: string;
}

export default function RSVPPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false);
  const [rsvpChoice, setRsvpChoice] = useState<'yes' | 'no' | null>(null);
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const res = await fetch(`/api/rsvp?token=${token}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Student not found');
          return;
        }
        setStudent(data.student);
        if (data.student.rsvp_status) {
          setSubmitted(true);
          setRsvpChoice(data.student.rsvp_status);
          setReason(data.student.rsvp_reason || '');
        }
      } catch {
        setError('Failed to load student data');
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [token]);

  const handleSubmitRSVP = async () => {
    if (!rsvpChoice) return;
    setRsvpSubmitting(true);
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          rsvp_status: rsvpChoice,
          rsvp_reason: rsvpChoice === 'no' ? reason : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStudent(data.student);
        setSubmitted(true);
        setRsvpChoice(data.student.rsvp_status || rsvpChoice);
        setReason(data.student.rsvp_reason || '');
      } else {
        setError(data.error);
      }
    } catch {
      setError('Submission failed');
    } finally {
      setRsvpSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error && !student) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '20px' }}>
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>😔</div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>Invalid Link</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{error}</p>
        </div>
      </div>
    );
  }

  const seatLabel = student?.seating_category === 'gallery'
    ? 'Gallery — Sit with your department'
    : student?.seat?.section
      ? `${student.seat.section}-${student.seat.row}${student.seat.column}`
      : 'Not assigned';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #0a0a1a 100%)',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>
            <span className="gradient-text">UniDay Award Ceremony</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            You are invited! 🎉
          </p>
        </div>

        {/* Student Info */}
        <div className="glass-card fade-in" style={{ padding: '32px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '4px' }}>{student?.student_name}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
            {student?.school} · {student?.branch} · {student?.batch}
          </p>

          {/* Awards */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
              Your Awards
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {student?.awards.map((a, i) => (
                <div key={i} style={{
                  padding: '12px 16px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  <span style={{ fontSize: '1.2rem' }}>🏆</span>
                  <div>
                    <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{a.type}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{a.details}</div>
                  </div>
                </div>
              ))}
            </div>
            {(student?.awards.length || 0) > 1 && (
              <p style={{
                fontSize: '0.8rem',
                color: 'var(--warning)',
                marginTop: '10px',
                padding: '8px 12px',
                background: 'var(--warning-glow)',
                borderRadius: '8px',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}>
                ⚠️ You have multiple awards. You may be called to the stage multiple times. Please contact your representative for details.
              </p>
            )}
          </div>
        </div>

        {/* RSVP Section */}
        {!submitted ? (
          <div className="glass-card fade-in" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', textAlign: 'center' }}>
              Will you attend the ceremony?
            </h3>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <button
                onClick={() => setRsvpChoice('yes')}
                style={{
                  flex: 1,
                  padding: '16px',
                  borderRadius: '12px',
                  border: `2px solid ${rsvpChoice === 'yes' ? 'var(--success)' : 'var(--border-subtle)'}`,
                  background: rsvpChoice === 'yes' ? 'var(--success-glow)' : 'var(--bg-secondary)',
                  color: rsvpChoice === 'yes' ? 'var(--success)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '1rem',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.2s ease',
                }}
              >
                ✅ Yes, I&apos;ll attend
              </button>
              <button
                onClick={() => setRsvpChoice('no')}
                style={{
                  flex: 1,
                  padding: '16px',
                  borderRadius: '12px',
                  border: `2px solid ${rsvpChoice === 'no' ? 'var(--danger)' : 'var(--border-subtle)'}`,
                  background: rsvpChoice === 'no' ? 'var(--danger-glow)' : 'var(--bg-secondary)',
                  color: rsvpChoice === 'no' ? 'var(--danger)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '1rem',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.2s ease',
                }}
              >
                ❌ No
              </button>
            </div>

            {rsvpChoice === 'no' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Reason (optional)
                </label>
                <textarea
                  className="input-field"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Tell us why you can't attend..."
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>
            )}

            {rsvpChoice && (
              <button
                onClick={handleSubmitRSVP}
                className={rsvpChoice === 'yes' ? 'btn-success' : 'btn-danger'}
                disabled={rsvpSubmitting}
                style={{ width: '100%' }}
              >
                {rsvpSubmitting ? 'Submitting...' : 'Confirm RSVP'}
              </button>
            )}
          </div>
        ) : (
          /* Post-RSVP */
          <div>
            {rsvpChoice === 'yes' ? (
              <>
                {/* Seat Info */}
                <div className="glass-card fade-in" style={{ padding: '32px', textAlign: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                    Your Seat
                  </h3>
                  <div style={{
                    fontSize: '2.5rem',
                    fontWeight: 900,
                    color: 'var(--accent-secondary)',
                    marginBottom: '8px',
                    letterSpacing: '0.05em',
                  }}>
                    {seatLabel}
                  </div>
                  {student?.seating_category === 'gallery' && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Please proceed to the Gallery section and sit with members of your department
                    </p>
                  )}
                </div>

                {/* Mini seat map for ground floor */}
                {student?.seating_category === 'ground' && student?.seat?.section && (
                  <div className="glass-card fade-in" style={{ padding: '24px', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center', marginBottom: '12px' }}>
                      STAGE 🎤
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      {'ABCDEFGHIJKLMNO'.split('').map((row) => (
                        <div key={row} style={{ display: 'flex', gap: '2px' }}>
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((col) => {
                            const isMySpot = student.seat?.row === row && student.seat?.column === col;
                            return (
                              <div
                                key={col}
                                style={{
                                  width: isMySpot ? '20px' : '16px',
                                  height: isMySpot ? '20px' : '16px',
                                  borderRadius: '3px',
                                  background: isMySpot ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                                  border: isMySpot ? '2px solid var(--accent-secondary)' : '1px solid var(--border-subtle)',
                                  boxShadow: isMySpot ? '0 0 12px var(--accent-glow)' : 'none',
                                  transition: 'all 0.3s ease',
                                }}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                    <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                      Section {student.seat.section.replace('S', '')} — Your seat is highlighted
                    </p>
                  </div>
                )}

                {/* QR Code */}
                <div className="glass-card fade-in" style={{ padding: '32px', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                    Your Check-in QR Code
                  </h3>
                  <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '16px',
                    display: 'inline-block',
                    marginBottom: '12px',
                  }}>
                    <QRCodeSVG value={student?.qr_code || ''} size={200} />
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Show this at the venue for quick check-in
                  </p>
                </div>
              </>
            ) : (
              <div className="glass-card fade-in" style={{ padding: '32px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>😢</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Sorry to hear that!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  We&apos;ll miss you at the ceremony. Your response has been recorded.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
