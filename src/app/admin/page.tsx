'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Stats {
  total: number;
  ground: number;
  gallery: number;
  email: { sent: number; opened: number; clicked: number };
  rsvp: { yes: number; no: number; pending: number };
  attendance: { checkedIn: number; total: number };
  awardStats: { _id: string; count: number }[];
}

interface Student {
  _id: string;
  register_no: string;
  student_name: string;
  email: string;
  school: string;
  branch: string;
  awards: { type: string; details: string }[];
  rsvp_status: string | null;
  checked_in: boolean;
  seat?: { section: string; row: string; column: number; type: string };
  seating_category: string;
  email_status?: {
    sent: boolean;
    opened: boolean;
    clicked: boolean;
    sent_at?: string;
    opened_at?: string;
    clicked_at?: string;
  };
}

interface ActionResult {
  success?: boolean;
  error?: string;
  total?: number;
  inserted?: number;
  modified?: number;
  type?: string;
  sent?: number;
  attempted?: number;
  failed?: number;
  message?: string;
  rows_read?: number;
  rows_with_register_no?: number;
  skipped_missing_register?: number;
  skipped_missing_name?: number;
  rank_only_rows?: number;
  sent_recipients?: Array<{ register_no: string; student_name: string; email: string }>;
  failures?: Array<{ to: string; status: string; error?: string }>;
}

type TabType = 'dashboard' | 'upload' | 'students' | 'seating' | 'email';

export default function AdminPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterRsvp, setFilterRsvp] = useState('');
  const [filterAward, setFilterAward] = useState('');
  const [filterCheckedIn, setFilterCheckedIn] = useState<'' | 'present' | 'absent'>('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<ActionResult | null>(null);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [emailResult, setEmailResult] = useState<ActionResult | null>(null);
  const [emailHistory, setEmailHistory] = useState<Student[]>([]);
  const [emailHistoryFilter, setEmailHistoryFilter] = useState<'all' | 'sent' | 'pending' | 'opened' | 'clicked'>('all');
  const [seatStudents, setSeatStudents] = useState<Student[]>([]);
  const [hoveredSeat, setHoveredSeat] = useState<Student | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const router = useRouter();

  useEffect(() => {
    const verifyRole = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (!res.ok || data.role !== 'admin') {
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

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      if (res.ok) {
        setStats(data);
      } else {
        // Set default stats so dashboard renders
        setStats({
          total: 0, ground: 0, gallery: 0,
          email: { sent: 0, opened: 0, clicked: 0 },
          rsvp: { yes: 0, no: 0, pending: 0 },
          attendance: { checkedIn: 0, total: 0 },
          awardStats: [],
        });
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setStats({
        total: 0, ground: 0, gallery: 0,
        email: { sent: 0, opened: 0, clicked: 0 },
        rsvp: { yes: 0, no: 0, pending: 0 },
        attendance: { checkedIn: 0, total: 0 },
        awardStats: [],
      });
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterRsvp) params.set('rsvp', filterRsvp);
      if (filterAward) params.set('award_type', filterAward);
      if (filterCheckedIn) params.set('checked_in', filterCheckedIn);
      params.set('page', String(currentPage));
      params.set('limit', '50');

      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();
      setStudents(data.users);
      setTotalStudents(data.total);
    } catch (err) {
      console.error(err);
    }
  }, [search, filterRsvp, filterAward, filterCheckedIn, currentPage]);

  const fetchSeatMap = useCallback(async () => {
    try {
      const res = await fetch('/api/seating?category=ground');
      const data = await res.json();
      if (res.ok) {
        setSeatStudents(data.students);
      } else {
        setSeatStudents([]); // Stop loading
      }
    } catch (err) {
      console.error('Seating fetch error:', err);
      setSeatStudents([]); // Stop loading
    }
  }, []);

  const fetchEmailHistory = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '0' });
      if (emailHistoryFilter !== 'all') {
        params.set('email_status', emailHistoryFilter);
      }

      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();

      if (!res.ok) {
        setEmailHistory([]);
        return;
      }

      const users = (data.users || []) as Student[];
      users.sort((a, b) => {
        const aTime = a.email_status?.sent_at ? new Date(a.email_status.sent_at).getTime() : 0;
        const bTime = b.email_status?.sent_at ? new Date(b.email_status.sent_at).getTime() : 0;
        return bTime - aTime;
      });
      setEmailHistory(users);
    } catch (err) {
      console.error('Email history fetch error:', err);
      setEmailHistory([]);
    }
  }, [emailHistoryFilter]);

  useEffect(() => {
    if (authChecked) fetchStats();
  }, [authChecked, fetchStats]);

  useEffect(() => {
    if (authChecked && activeTab === 'students') fetchStudents();
  }, [activeTab, authChecked, fetchStudents]);

  useEffect(() => {
    if (authChecked && activeTab === 'seating') fetchSeatMap();
  }, [activeTab, authChecked, fetchSeatMap]);

  useEffect(() => {
    if (authChecked && activeTab === 'email') fetchEmailHistory();
  }, [activeTab, authChecked, fetchEmailHistory]);

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

  const handleUpload = async (type: 'ground' | 'gallery') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploading(true);
      setUploadResult(null);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        setUploadResult(data);
        fetchStats();
      } catch (err: unknown) {
        setUploadResult({ error: err instanceof Error ? err.message : 'Upload failed' });
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const handleSendEmails = async () => {
    setSendingEmails(true);
    setEmailResult(null);
    try {
      const res = await fetch('/api/email/send', { method: 'POST' });
      const data = await res.json();
      setEmailResult(data);
      fetchStats();
      fetchEmailHistory();
    } catch (err: unknown) {
      setEmailResult({ error: err instanceof Error ? err.message : 'Email sending failed' });
    } finally {
      setSendingEmails(false);
    }
  };

  // Build seat map grid
  const renderSeatMap = () => {
    const sections = ['S1', 'S2', 'S3', 'S4'];
    const rows = 'ABCDEFGHIJKLMNO'.split('');
    const cols = Array.from({ length: 10 }, (_, i) => i + 1);

    const seatMap: Record<string, Student> = {};
    seatStudents.forEach((s) => {
      if (s.seat?.section && s.seat?.row && s.seat?.column) {
        const key = `${s.seat.section}-${s.seat.row}${s.seat.column}`;
        seatMap[key] = s;
      }
    });

    return (
      <div>
        {/* Stage indicator */}
        <div style={{
          textAlign: 'center',
          padding: '12px 40px',
          background: '#1a1a1a',
          color: '#e2e2e2',
          border: '1px solid #333',
          borderRadius: '12px',
          marginBottom: '24px',
          fontWeight: 800,
          fontSize: '0.8rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}>
          🎤 STAGE
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { cls: 'seat-empty', label: 'Empty' },
            { cls: 'seat-reserved', label: 'Reserved' },
            { cls: 'seat-rsvp-yes', label: 'RSVP Yes' },
            { cls: 'seat-rsvp-no', label: 'RSVP No' },
            { cls: 'seat-checked-in', label: 'Checked In' },
          ].map((l) => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <div className={`seat-cell ${l.cls}`} style={{ width: '20px', height: '20px' }} />
              {l.label}
            </div>
          ))}
        </div>

        {/* Sections grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {sections.map((section) => (
            <div key={section} className="glass-card" style={{ padding: '20px' }}>
              <h3 style={{ textAlign: 'center', marginBottom: '12px', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                Section {section.replace('S', '')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {rows.map((row) => (
                  <div key={row} style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                    <span style={{ width: '20px', fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>{row}</span>
                    {cols.map((col) => {
                      const key = `${section}-${row}${col}`;
                      const student = seatMap[key];
                      let cls = 'seat-empty';
                      if (student) {
                        if (student.checked_in) cls = 'seat-checked-in';
                        else if (student.rsvp_status === 'yes') cls = 'seat-rsvp-yes';
                        else if (student.rsvp_status === 'no') cls = 'seat-rsvp-no';
                        else cls = 'seat-reserved';
                      }
                      return (
                        <div
                          key={key}
                          className={`seat-cell ${cls}`}
                          onMouseEnter={(e) => {
                            if (student) {
                              setHoveredSeat(student);
                              setTooltipPos({ x: e.clientX, y: e.clientY });
                            }
                          }}
                          onMouseLeave={() => setHoveredSeat(null)}
                          title={student ? `${student.student_name} (${student.register_no})` : key}
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

        {/* Hover tooltip */}
        {hoveredSeat && (
          <div style={{
            position: 'fixed',
            top: tooltipPos.y + 15,
            left: tooltipPos.x + 15,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-accent)',
            borderRadius: '12px',
            padding: '16px',
            zIndex: 1000,
            minWidth: '240px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}>
            <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '6px' }}>{hoveredSeat.student_name}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{hoveredSeat.register_no}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{hoveredSeat.school} · {hoveredSeat.branch}</p>
            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {hoveredSeat.awards.map((a, i) => (
                <span key={i} className="badge badge-accent">{a.type}: {a.details}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'upload', label: 'Upload', icon: '📁' },
    { id: 'students', label: 'Students', icon: '👥' },
    { id: 'seating', label: 'Seat Map', icon: '💺' },
    { id: 'email', label: 'Emails', icon: '📧' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: '260px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 50,
      }}>
        <div style={{ marginBottom: '32px', padding: '0 8px' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 950, letterSpacing: '-0.02em', color: '#fff' }}>
            UniDay
          </h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Admin Panel</p>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                border: 'none',
                background: activeTab === tab.id ? 'var(--accent-glow)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: activeTab === tab.id ? 600 : 400,
                transition: 'all 0.2s ease',
                textAlign: 'left',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
           <button onClick={() => window.open('/mc', '_blank')} className="btn-secondary" style={{ width: '100%' }}>
             Go to MC Dashboard ↗
           </button>
           <button onClick={() => window.open('/volunteer', '_blank')} className="btn-secondary" style={{ width: '100%' }}>
             Go to Volunteer ↗
           </button>
           <button onClick={handleLogout} className="btn-danger" style={{ width: '100%', marginTop: '8px' }}>
             Sign Out
           </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, marginLeft: '260px', padding: '32px' }}>
        {/* DASHBOARD */}
        {activeTab === 'dashboard' && stats && (
          <div className="fade-in">
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '24px' }}>Dashboard Overview</h2>

            {/* Top stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              <div className="stat-card">
                <div className="stat-value" style={{ color: '#fff' }}>{stats.total}</div>
                <div className="stat-label">Total Students</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--accent-secondary)' }}>{stats.ground}</div>
                <div className="stat-label">Ground Floor</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--info)' }}>{stats.gallery}</div>
                <div className="stat-label">Gallery</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.attendance.checkedIn}</div>
                <div className="stat-label">Checked In</div>
              </div>
            </div>

            {/* RSVP & Email stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '20px', color: 'var(--text-secondary)' }}>RSVP Status</h3>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>{stats.rsvp.yes}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Accepted</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--danger)' }}>{stats.rsvp.no}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Declined</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--warning)' }}>{stats.rsvp.pending}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pending</div>
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{ marginTop: '20px', height: '8px', borderRadius: '4px', background: 'var(--bg-secondary)', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${(stats.rsvp.yes / Math.max(stats.total, 1)) * 100}%`, background: 'var(--success)', transition: 'width 0.5s ease' }} />
                  <div style={{ width: `${(stats.rsvp.no / Math.max(stats.total, 1)) * 100}%`, background: 'var(--danger)', transition: 'width 0.5s ease' }} />
                </div>
              </div>

              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '20px', color: 'var(--text-secondary)' }}>Email Tracking</h3>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--info)' }}>{stats.email.sent}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sent</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-secondary)' }}>{stats.email.opened}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Opened</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>{stats.email.clicked}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Clicked</div>
                  </div>
                </div>
                <div style={{ marginTop: '20px', height: '8px', borderRadius: '4px', background: 'var(--bg-secondary)', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${(stats.email.opened / Math.max(stats.email.sent, 1)) * 100}%`, background: 'var(--accent-secondary)', transition: 'width 0.5s ease' }} />
                  <div style={{ width: `${(stats.email.clicked / Math.max(stats.email.sent, 1)) * 100}%`, background: 'var(--success)', transition: 'width 0.5s ease' }} />
                </div>
              </div>
            </div>

            {/* Award breakdown */}
            {stats.awardStats.length > 0 && (
              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '20px', color: 'var(--text-secondary)' }}>Awards Breakdown</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                  {stats.awardStats.map((a) => (
                    <div key={a._id} style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-secondary)' }}>{a.count}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{a._id}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* UPLOAD */}
        {activeTab === 'upload' && (
          <div className="fade-in">
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '8px' }}>Upload Student Data</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.9rem' }}>
              Upload Excel files to import student records and auto-assign seating.
            </p>

            {/* Expected format */}
            <div className="glass-card" style={{ padding: '24px', marginBottom: '32px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>📋 Expected Excel Column Format</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Your Excel file should have these columns:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['school', 'program', 'branch', 'batch', 'register_no', 'student_name', 'program_code', 'email', 'phone_number', 'award_type', 'award_details'].map((col) => (
                  <span key={col} className="badge badge-accent" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                    {col}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '12px' }}>
                💡 If a student has multiple awards, add them as separate rows with the same <strong>register_no</strong>. They will be merged automatically, and seats will be auto-assigned by the backend.
              </p>
            </div>

            {/* Upload buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div className="glass-card" style={{ padding: '32px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏛️</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Ground Floor</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  Rank 1-3 students, BOGS, Club awards.<br />Seats will be auto-assigned.
                </p>
                <button
                  onClick={() => handleUpload('ground')}
                  className="btn-primary"
                  disabled={uploading}
                  style={{ width: '100%' }}
                >
                  {uploading ? 'Uploading...' : 'Upload Ground Floor Excel'}
                </button>
              </div>

              <div className="glass-card" style={{ padding: '32px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎭</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Gallery</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  Rank 4-6 students.<br />No assigned seats — sit with department.
                </p>
                <button
                  onClick={() => handleUpload('gallery')}
                  className="btn-primary"
                  disabled={uploading}
                  style={{ width: '100%' }}
                >
                  {uploading ? 'Uploading...' : 'Upload Gallery Excel'}
                </button>
              </div>
            </div>

            {uploadResult && (
              <div className="glass-card" style={{ padding: '20px', marginTop: '24px' }}>
                {uploadResult.error ? (
                  <div>
                    <div style={{ color: 'var(--danger)', marginBottom: '12px' }}>❌ {uploadResult.error}</div>
                    {(uploadResult.rows_read !== undefined || uploadResult.rows_with_register_no !== undefined) && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                        {[
                          ['Rows read', uploadResult.rows_read],
                          ['Rows with reg no', uploadResult.rows_with_register_no],
                          ['Skipped no reg', uploadResult.skipped_missing_register],
                          ['Skipped no name', uploadResult.skipped_missing_name],
                          ['Rank-only rows', uploadResult.rank_only_rows],
                        ].map(([label, value]) => (
                          <div key={String(label)} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '12px' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
                            <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{value ?? 0}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ color: 'var(--success)', marginBottom: '12px' }}>
                      ✅ Upload successful! {uploadResult.total} students processed ({uploadResult.inserted} new, {uploadResult.modified} updated) — Type: {uploadResult.type}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                      {[
                        ['Rows read', uploadResult.rows_read],
                        ['Rows with reg no', uploadResult.rows_with_register_no],
                        ['Skipped no reg', uploadResult.skipped_missing_register],
                        ['Skipped no name', uploadResult.skipped_missing_name],
                        ['Rank-only rows', uploadResult.rank_only_rows],
                      ].map(([label, value]) => (
                        <div key={String(label)} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '12px' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{value ?? 0}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STUDENTS TABLE */}
        {activeTab === 'students' && (
          <div className="fade-in">
            {/* Global Quick Stats */}
            {stats && (
              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <div style={{ flex: 1, padding: '16px', borderRadius: '12px', background: '#171717', border: '1px solid #222' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Total</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{stats.total}</div>
                </div>
                <div style={{ flex: 1, padding: '16px', borderRadius: '12px', background: '#171717', border: '1px solid #222' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>RSVP Accepted</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>{stats.rsvp.yes}</div>
                </div>
                <div style={{ flex: 1, padding: '16px', borderRadius: '12px', background: '#171717', border: '1px solid #222' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Checked In</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4ade80' }}>{stats.attendance.checkedIn}</div>
                </div>
                <div style={{ flex: 1, padding: '16px', borderRadius: '12px', background: '#171717', border: '1px solid #222' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Absence Rate</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>
                    {stats.total > 0 ? Math.round(((stats.total - stats.attendance.checkedIn) / stats.total) * 100) : 0}%
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <input
                className="input-field"
                placeholder="Search by name, register no, or email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                style={{ maxWidth: '320px' }}
              />
              <select
                className="input-field"
                value={filterRsvp}
                onChange={(e) => { setFilterRsvp(e.target.value); setCurrentPage(1); }}
                style={{ maxWidth: '160px' }}
              >
                <option value="">All RSVP</option>
                <option value="yes">RSVP Yes</option>
                <option value="no">RSVP No</option>
              </select>
              <select
                className="input-field"
                value={filterAward}
                onChange={(e) => { setFilterAward(e.target.value); setCurrentPage(1); }}
                style={{ maxWidth: '160px' }}
              >
                <option value="">All Awards</option>
                <option value="merit">Merit</option>
                <option value="bogs">BOGS</option>
                <option value="sports">Sports</option>
                <option value="ncc">NCC</option>
                <option value="club">Club</option>
              </select>
              <select
                className="input-field"
                value={filterCheckedIn}
                onChange={(e) => {
                  setFilterCheckedIn(e.target.value as '' | 'present' | 'absent');
                  setCurrentPage(1);
                }}
                style={{ maxWidth: '160px' }}
              >
                <option value="">All Attendance</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
              </select>
            </div>

            {/* Table */}
            <div className="glass-card" style={{ overflow: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Register No</th>
                    <th>Name</th>
                    <th>School</th>
                    <th>Awards</th>
                    <th>RSVP</th>
                    <th>Seat</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s._id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.register_no}</td>
                      <td>{s.student_name}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s.school}<br />{s.branch}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {s.awards.map((a, i) => (
                            <span key={i} style={{
                              padding: '3px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600,
                              background: a.type === 'merit' ? 'rgba(251,191,36,0.1)' : 'rgba(99,102,241,0.1)',
                              color: a.type === 'merit' ? '#fbbf24' : '#818cf8',
                              border: `1px solid ${a.type === 'merit' ? 'rgba(251,191,36,0.2)' : 'rgba(99,102,241,0.2)'}`,
                              textTransform: 'uppercase', letterSpacing: '0.04em'
                            }}>
                              {a.type}: {a.details}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        {s.rsvp_status === 'yes' && <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>YES</span>}
                        {s.rsvp_status === 'no' && <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>NO</span>}
                        {!s.rsvp_status && <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>PENDING</span>}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {s.seating_category === 'gallery' ? (
                          <span className="badge badge-info">Gallery</span>
                        ) : s.seat?.section ? (
                          `${s.seat.section}-${s.seat.row}${s.seat.column}`
                        ) : '-'}
                      </td>
                      <td>
                        {s.checked_in ? (
                          <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                            PRESENT
                          </span>
                        ) : (
                          <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
                            ABSENT
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
              <button className="btn-secondary" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                Previous
              </button>
              <span style={{ padding: '12px 20px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Page {currentPage} of {Math.ceil(totalStudents / 50)}
              </span>
              <button className="btn-secondary" onClick={() => setCurrentPage((p) => p + 1)} disabled={currentPage >= Math.ceil(totalStudents / 50)}>
                Next
              </button>
            </div>
          </div>
        )}

        {/* SEATING MAP */}
        {activeTab === 'seating' && (
          <div className="fade-in">
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '24px' }}>Seating Map — Ground Floor</h2>
            {renderSeatMap()}
          </div>
        )}

        {/* EMAILS */}
        {activeTab === 'email' && (
          <div className="fade-in">
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '8px' }}>Email Management</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.9rem' }}>
              Send invitation emails in batches of 50 via Google AppScript and review the mailing history below.
            </p>

            <div className="glass-card" style={{ padding: '32px', textAlign: 'center', maxWidth: '500px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📨</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Send Invitation Emails</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Sends 50 unsent emails per batch.<br />Keep clicking until all are sent.
              </p>
              <button
                onClick={handleSendEmails}
                className="btn-primary"
                disabled={sendingEmails}
                style={{ width: '100%' }}
              >
                {sendingEmails ? 'Sending...' : 'Send Next Batch (50)'}
              </button>

              {emailResult && (
                <div style={{ marginTop: '16px', padding: '16px', borderRadius: '12px', background: emailResult.error ? 'var(--danger-glow)' : 'var(--success-glow)', textAlign: 'left' }}>
                  {emailResult.error ? (
                    <span style={{ color: 'var(--danger)' }}>❌ {emailResult.error}</span>
                  ) : (
                    <div>
                      <div style={{ color: 'var(--success)', fontWeight: 700, marginBottom: '10px' }}>
                        ✅ Sent {emailResult.sent ?? 0} of {emailResult.attempted ?? 0} attempted emails
                      </div>
                      {Boolean(emailResult.sent_recipients?.length) && (
                        <div style={{ marginBottom: '10px' }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            Sent to
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {emailResult.sent_recipients?.map((recipient) => (
                              <div key={`${recipient.register_no}-${recipient.email}`} style={{ fontSize: '0.82rem' }}>
                                {recipient.student_name} · {recipient.register_no} · {recipient.email}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {Boolean(emailResult.failures?.length) && (
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            Not sent to
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {emailResult.failures?.map((failure, index) => (
                              <div key={`${failure.to}-${index}`} style={{ fontSize: '0.82rem', color: 'var(--danger)' }}>
                                {failure.to || 'Unknown recipient'} {failure.error ? `· ${failure.error}` : ''}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="glass-card" style={{ padding: '24px', marginTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>History</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Sent, pending, opened, and clicked mail history.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(['all', 'sent', 'pending', 'opened', 'clicked'] as const).map((value) => (
                    <button
                      key={value}
                      onClick={() => setEmailHistoryFilter(value)}
                      className={emailHistoryFilter === value ? 'btn-primary' : 'btn-secondary'}
                      style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                    >
                      {value === 'all' ? 'All' : value.charAt(0).toUpperCase() + value.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {emailHistory.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No email history available for this filter.</div>
              ) : (
                <div style={{ overflow: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Register No</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Opened</th>
                        <th>Clicked</th>
                        <th>Sent At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emailHistory.slice(0, 200).map((student) => (
                        <tr key={student._id}>
                          <td>{student.student_name}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{student.register_no}</td>
                          <td>{student.email || 'Not available'}</td>
                          <td>
                            {student.email_status?.sent ? (
                              <span className="badge badge-success">Sent</span>
                            ) : (
                              <span className="badge badge-warning">Pending</span>
                            )}
                          </td>
                          <td>
                            {student.email_status?.opened ? (
                              <span className="badge badge-info">Opened</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No</span>
                            )}
                          </td>
                          <td>
                            {student.email_status?.clicked ? (
                              <span className="badge badge-accent">Clicked</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No</span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            {student.email_status?.sent_at ? new Date(student.email_status.sent_at).toLocaleString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dashboard loading state */}
        {activeTab === 'dashboard' && !stats && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div className="spinner" />
          </div>
        )}
      </main>
    </div>
  );
}
