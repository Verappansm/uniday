import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { randomBytes } from 'crypto';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { assignGroundSeats, assignClubSeats } from '@/lib/seating';

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
  rank?: string;
}

type RawExcelRow = Record<string, unknown>;

interface ImportedStudent {
  register_no: string;
  student_name: string;
  email: string;
  phone?: string;
  school: string;
  program: string;
  branch: string;
  batch: string;
  program_code: string;
  awards: { type: string; details: string }[];
  rsvp_status: null;
  qr_code: string;
  checked_in: boolean;
  upload_order: number;
  seating_category: 'ground' | 'gallery';
  seat:
    | { type: 'Gallery' }
    | { type: 'Ground'; section?: string; row?: string; column?: number };
  email_status: { sent: boolean; opened: boolean; clicked: boolean };
  seating_raw: string;
}

function normalizeHeader(header: string): string {
  return header
    .replace(/^\ufeff/, '')
    .trim()
    .toLowerCase()
    .replace(/[\s./-]+/g, '_')
    .replace(/[()]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const HEADER_ALIASES: Record<string, keyof ExcelRow> = {
  school: 'school',
  school_code: 'school',
  program: 'program',
  programme: 'program',
  branch: 'branch',
  dept: 'branch',
  department: 'branch',
  batch: 'batch',
  register_no: 'register_no',
  register_number: 'register_no',
  register_no_: 'register_no',
  register_num: 'register_no',
  reg_no: 'register_no',
  reg_number: 'register_no',
  registerno: 'register_no',
  register: 'register_no',
  registration: 'register_no',
  registration_id: 'register_no',
  registration_no: 'register_no',
  registration_number: 'register_no',
  enrollment_no: 'register_no',
  enrollment_number: 'register_no',
  student_name: 'student_name',
  studentname: 'student_name',
  name: 'student_name',
  student: 'student_name',
  name_of_the_student: 'student_name',
  name_of_student: 'student_name',
  program_code: 'program_code',
  programe_code: 'program_code',
  email: 'email',
  email_id: 'email',
  mail_id: 'email',
  mail: 'email',
  phone_number: 'phone_number',
  phone_no: 'phone_number',
  phone: 'phone_number',
  mobile: 'phone_number',
  mobile_number: 'phone_number',
  award_type: 'award_type',
  award: 'award_type',
  position: 'award_type',
  rank_position: 'award_type',
  award_details: 'award_details',
  award_detail: 'award_details',
  award_name: 'award_details',
  club_name: 'award_details',
  "club name": 'award_details',
  event_name: 'award_details',
  rank: 'rank',
};

const EXCEL_FIELDS = new Set(['school', 'program', 'branch', 'batch', 'register_no', 'student_name', 'program_code', 'email', 'phone_number', 'award_type', 'award_details', 'rank']);

function normalizeRow(row: RawExcelRow): ExcelRow {
  const normalized: ExcelRow = {};

  Object.entries(row).forEach(([rawKey, value]) => {
    const normalizedKey = normalizeHeader(rawKey);
    const key = HEADER_ALIASES[normalizedKey] || (EXCEL_FIELDS.has(normalizedKey) ? normalizedKey : null);
    if (!key) return;
    normalized[key as keyof ExcelRow] = String(value ?? '').trim();
  });

  return normalized;
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
    const rawData = XLSX.utils.sheet_to_json<RawExcelRow>(sheet, { defval: '' });
    const normalizedRows: ExcelRow[] = rawData.map(normalizeRow);

    let skippedMissingRegister = 0;
    let skippedMissingName = 0;
    let rankOnlyRows = 0;

    // Merge duplicates by register_no, preserving first-seen order
    const studentMap = new Map<string, ImportedStudent>();
    let uploadOrderCounter = 1;

    for (const row of normalizedRows) {
      const regNo = String(row.register_no || '').trim();
      const studentName = String(row.student_name || '').trim();
      const hasRank = String(row.rank || '').trim().length > 0;

      if (!regNo) {
        skippedMissingRegister += 1;
        if (hasRank) rankOnlyRows += 1;
        continue;
      }

      if (!studentName) {
        skippedMissingName += 1;
        continue;
      }

      if (studentMap.has(regNo)) {
        // Merge awards
        const existing = studentMap.get(regNo);
        const derivedAwardType = row.award_type || (row.rank ? 'merit' : '');
        const derivedAwardDetails =
          row.award_details || (row.rank ? `Rank ${String(row.rank).trim()}` : '');

        if (existing && derivedAwardType && derivedAwardDetails) {
          existing.awards.push({
            type: derivedAwardType.trim(),
            details: derivedAwardDetails.trim(),
          });
        }
      } else {
          const derivedAwardType = row.award_type || (row.rank ? 'merit' : uploadType === 'clubs' ? 'club' : '');
          const derivedAwardDetails =
            row.award_details || (row.rank ? `Rank ${String(row.rank).trim()}` : uploadType === 'clubs' ? 'club' : '');

          const student: ImportedStudent = {
            register_no: regNo,
            student_name: studentName,
            email: (row.email || '').trim(),
            phone: (row.phone_number || '').trim() || undefined,
            school: (row.school || '').trim(),
            program: (row.program || '').trim(),
            branch: (row.branch || '').trim(),
            batch: (row.batch || '').trim(),
            program_code: (row.program_code || '').trim(),
            awards:
              derivedAwardType || derivedAwardDetails
              ? [{ type: derivedAwardType.trim(), details: derivedAwardDetails.trim() }]
              : [],
          rsvp_status: null,
          qr_code: randomBytes(16).toString('hex'),
          checked_in: false,
          upload_order: uploadOrderCounter++,
          seating_category: uploadType === 'gallery' ? 'gallery' : uploadType === 'clubs' ? 'ground' : 'ground',
          seat: uploadType === 'gallery'
            ? { type: 'Gallery' as const }
            : { type: 'Ground' as const },
          email_status: { sent: false, opened: false, clicked: false },
          seating_raw: '',
        };
        studentMap.set(regNo, student);
      }
    }

    const studentsArray: ImportedStudent[] = Array.from(studentMap.values());
    let bulkArray = studentsArray;

    // Seats are assigned fully by backend rules using upload order and award types.
    if (uploadType === 'ground' || uploadType === 'clubs') {
      const existingUsers = await User.find({
        seating_category: 'ground',
        register_no: { $nin: studentsArray.map((s) => s.register_no) },
      }).lean();

      const combined = [
        ...existingUsers.map((u: any) => ({
          register_no: u.register_no,
          student_name: u.student_name,
          email: u.email,
          phone: u.phone,
          school: u.school,
          program: u.program,
          branch: u.branch,
          batch: u.batch,
          program_code: u.program_code,
          awards: u.awards || [],
          rsvp_status: u.rsvp_status,
          qr_code: u.qr_code,
          checked_in: u.checked_in,
          upload_order: u.upload_order,
          seating_category: 'ground' as const,
          seat: u.seat || { type: 'Ground' },
          email_status: u.email_status,
          seating_raw: u.seating_raw || '',
        })),
        ...studentsArray,
      ];

      combined.sort((a, b) => a.upload_order - b.upload_order);
      assignGroundSeats(combined);
      bulkArray = combined;
    }

    // Upsert into MongoDB
    const bulkOps = bulkArray.map((student) => ({
      updateOne: {
        filter: { register_no: student.register_no },
        update: { $set: student },
        upsert: true,
      },
    }));

    const result = await User.bulkWrite(bulkOps);

    const diagnostics = {
      rows_read: rawData.length,
      rows_with_register_no: normalizedRows.filter((row) => String(row.register_no || '').trim()).length,
      skipped_missing_register: skippedMissingRegister,
      skipped_missing_name: skippedMissingName,
      rank_only_rows: rankOnlyRows,
    };

    if (studentsArray.length === 0 && rawData.length > 0) {
      return NextResponse.json(
        {
          error:
            rankOnlyRows > 0
              ? 'The uploaded sheet contains mostly rank-only rows. Student identity columns like REGISTER_NUMBER and STUDENT_NAME are empty for most rows.'
              : 'No valid student rows found in the uploaded sheet.',
          ...diagnostics,
          type: uploadType,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      total: studentsArray.length,
      inserted: result.upsertedCount,
      modified: result.modifiedCount,
      type: uploadType,
      ...diagnostics,
    });
  } catch (error: unknown) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
