import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { randomBytes } from 'crypto';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { assignGroundSeats } from '@/lib/seating';

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
  student_name: 'student_name',
  name: 'student_name',
  student: 'student_name',
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
  award_details: 'award_details',
  award_detail: 'award_details',
  award_name: 'award_details',
  seating: 'seating',
  seat: 'seating',
  rank: 'rank',
};

function normalizeRow(row: RawExcelRow): ExcelRow {
  const normalized: ExcelRow = {};

  Object.entries(row).forEach(([rawKey, value]) => {
    const key = HEADER_ALIASES[normalizeHeader(rawKey)];
    if (!key) return;
    normalized[key] = String(value ?? '').trim();
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
    console.log('--- EXCEL PARSE DIAGNOSTICS ---');
    console.log('rawData length:', rawData.length);
    if (rawData.length > 0) console.log('Sample raw row:', rawData[0]);

    const normalizedRows: ExcelRow[] = rawData.map(normalizeRow);
    if (normalizedRows.length > 0) console.log('Sample normalized row:', normalizedRows[0]);
    
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
        const derivedAwardType = row.award_type || (row.rank ? 'merit' : '');
        const derivedAwardDetails =
          row.award_details || (row.rank ? `Rank ${String(row.rank).trim()}` : '');

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
            derivedAwardType && derivedAwardDetails
              ? [{ type: derivedAwardType.trim(), details: derivedAwardDetails.trim() }]
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
        };
        studentMap.set(regNo, student);
      }
    }

    let studentsArray: ImportedStudent[] = Array.from(studentMap.values());
    console.log('Valid students after processing:', studentsArray.length);
    console.log('Skipped register:', skippedMissingRegister, 'Skipped name:', skippedMissingName);

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
