import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { requireRole } from '@/lib/auth';
import { buildSectionGrid } from '@/lib/seating';

// QR Check-in
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(request, ['admin', 'volunteer']);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { token, register_no } = await request.json();

    if (!token && !register_no) {
      return NextResponse.json({ error: 'Token or register number is required' }, { status: 400 });
    }

    const lookupFilter = token ? { qr_code: token } : { register_no };
    const user = await User.findOneAndUpdate(
      { ...lookupFilter, checked_in: false },
      { $set: { checked_in: true } },
      { new: true }
    );

    if (!user) {
      const existingUser = await User.findOne(lookupFilter);
      if (!existingUser) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      const sectionStudents = existingUser.seat?.section
        ? await User.find({
            seating_category: existingUser.seating_category,
            'seat.section': existingUser.seat.section,
          })
            .select('register_no student_name school branch awards seat checked_in rsvp_status')
            .sort({ 'seat.row': 1, 'seat.column': 1 })
        : [];

      return NextResponse.json(
        {
          error: 'Already checked in',
          already_checked_in: true,
          student: {
            student_name: existingUser.student_name,
            register_no: existingUser.register_no,
            school: existingUser.school,
            branch: existingUser.branch,
            program: existingUser.program,
            qr_code: existingUser.qr_code,
            seat: existingUser.seat,
            seating_category: existingUser.seating_category,
            awards: existingUser.awards,
          },
          seat_map: existingUser.seat?.section
            ? buildSectionGrid(sectionStudents, String(existingUser.seat.section))
            : null,
        },
        { status: 409 }
      );
    }

    const sectionStudents = user.seat?.section
      ? await User.find({
          seating_category: user.seating_category,
          'seat.section': user.seat.section,
        })
          .select('register_no student_name school branch awards seat checked_in rsvp_status')
          .sort({ 'seat.row': 1, 'seat.column': 1 })
      : [];

    return NextResponse.json({
      success: true,
      student: {
        student_name: user.student_name,
        register_no: user.register_no,
        school: user.school,
        branch: user.branch,
        program: user.program,
        qr_code: user.qr_code,
        seat: user.seat,
        seating_category: user.seating_category,
        awards: user.awards,
      },
      checked_in_by: session.username,
      seat_map: user.seat?.section ? buildSectionGrid(sectionStudents, String(user.seat.section)) : null,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Check-in failed' },
      { status: 500 }
    );
  }
}
