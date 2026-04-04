import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { randomBytes } from 'crypto';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

interface ExcelRow {
  school?: string;
  program?: string;
  branch?: string;
  batch?: string;
  register_no?: string;
  student_name?: string;
  program_code?: string;
  email?: string;
  phone_number?: string;
  award_type?: string;
  award_details?: string;
  seating?: string;
}

// Seating assignment for ground floor
function assignGroundSeats(students: any[]) {
  const sections = ['S1', 'S2', 'S3', 'S4'];
  const rows = 'ABCDEFGHIJKLMNO'.split('');
  const cols = Array.from({ length: 10 }, (_, i) => i + 1);

  // Club types for S4
  const clubTypes = [
    'best arts and cultural',
    'best literary club',
    'best social and outreach club',
    'best tech club',
    'best health and wellness club',
    'best recreational club',
    'best chapter',
    'elite club award 1',
    'elite club award 2',
  ];

  // Separate students by award type
  const bogsStudents: any[] = [];
  const clubStudents: Map<string, any[]> = new Map();
  const regularStudents: any[] = [];

  clubTypes.forEach((ct) => clubStudents.set(ct, []));

  for (const student of students) {
    const hasAward = (type: string) =>
      student.awards.some((a: any) => a.type.toLowerCase().includes(type));

    const getClubType = () => {
      for (const ct of clubTypes) {
        if (student.awards.some((a: any) => a.details.toLowerCase().includes(ct))) {
          return ct;
        }
      }
      return null;
    };

    if (hasAward('bogs')) {
      bogsStudents.push(student);
    } else {
      const club = getClubType();
      if (club) {
        clubStudents.get(club)?.push(student);
      } else {
        regularStudents.push(student);
      }
    }
  }

  // Track assigned seats
  const assignments: Map<string, any> = new Map();

  // Helper to assign seat
  const assignSeat = (student: any, section: string, row: string, col: number) => {
    student.seat = {
      section,
      row,
      column: col,
      type: 'Ground',
    };
    assignments.set(`${section}-${row}${col}`, student);
  };

  // 1. BOGS → S1-A1 to S1-A10
  bogsStudents.forEach((s, i) => {
    if (i < 10) {
      assignSeat(s, 'S1', 'A', cols[i]);
    }
  });

  // 2. Regular students → S1-B1 onwards (sequential fill)
  let sectionIdx = 0;
  let rowIdx = 1; // Start at B (index 1)
  let colIdx = 0;

  for (const student of regularStudents) {
    // Skip S4 (reserved for clubs)
    while (sectionIdx < 3) {
      const seatKey = `${sections[sectionIdx]}-${rows[rowIdx]}${cols[colIdx]}`;
      if (!assignments.has(seatKey)) {
        assignSeat(student, sections[sectionIdx], rows[rowIdx], cols[colIdx]);
        colIdx++;
        if (colIdx >= 10) {
          colIdx = 0;
          rowIdx++;
          if (rowIdx >= 15) {
            rowIdx = 0;
            sectionIdx++;
          }
        }
        break;
      }
      colIdx++;
      if (colIdx >= 10) {
        colIdx = 0;
        rowIdx++;
        if (rowIdx >= 15) {
          rowIdx = 0;
          sectionIdx++;
        }
      }
    }
  }

  // Remaining seats in S2/S3 after regular: reserve blocks
  // 35 for 100% attendance, 2 for sports, 30 for NSS
  // These are left empty / marked as reserved

  // 3. Club awards → S4 (one row per club type)
  clubTypes.forEach((clubType, clubIdx) => {
    const clubRow = rows[clubIdx]; // A for first club, B for second, etc.
    const members = clubStudents.get(clubType) || [];
    members.forEach((s, i) => {
      if (i < 10) {
        assignSeat(s, 'S4', clubRow, cols[i]);
      }
    });
  });

  return students;
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const uploadType = formData.get('type') as string; // 'ground' or 'gallery'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData: ExcelRow[] = XLSX.utils.sheet_to_json(sheet);

    // Merge duplicates by register_no, preserving first-seen order
    const studentMap = new Map<string, any>();
    let uploadOrderCounter = 1;

    for (const row of rawData) {
      const regNo = String(row.register_no || '').trim();
      if (!regNo) continue;

      if (studentMap.has(regNo)) {
        // Merge awards
        const existing = studentMap.get(regNo);
        if (row.award_type && row.award_details) {
          existing.awards.push({
            type: row.award_type.trim(),
            details: row.award_details.trim(),
          });
        }
      } else {
        studentMap.set(regNo, {
          register_no: regNo,
          student_name: (row.student_name || '').trim(),
          email: (row.email || '').trim(),
          phone: (row.phone_number || '').trim() || undefined,
          school: (row.school || '').trim(),
          program: (row.program || '').trim(),
          branch: (row.branch || '').trim(),
          batch: (row.batch || '').trim(),
          program_code: (row.program_code || '').trim(),
          awards:
            row.award_type && row.award_details
              ? [{ type: row.award_type.trim(), details: row.award_details.trim() }]
              : [],
          rsvp_status: null,
          qr_code: randomBytes(16).toString('hex'),
          checked_in: false,
          upload_order: uploadOrderCounter++,
          seating_category: uploadType === 'gallery' ? 'gallery' : 'ground',
          seat: uploadType === 'gallery'
            ? { type: 'Gallery' as const }
            : { type: 'Ground' as const },
          email_status: { sent: false, opened: false, clicked: false },
          seating_raw: (row.seating || '').trim(),
        });
      }
    }

    let studentsArray = Array.from(studentMap.values());

    // Assign seats for ground floor
    if (uploadType === 'ground') {
      studentsArray = assignGroundSeats(studentsArray);
    }

    // Upsert into MongoDB
    const bulkOps = studentsArray.map((student) => ({
      updateOne: {
        filter: { register_no: student.register_no },
        update: { $set: student },
        upsert: true,
      },
    }));

    const result = await User.bulkWrite(bulkOps);

    return NextResponse.json({
      success: true,
      total: studentsArray.length,
      inserted: result.upsertedCount,
      modified: result.modifiedCount,
      type: uploadType,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
