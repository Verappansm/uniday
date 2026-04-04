import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

// QR Check-in
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { token, register_no } = await request.json();

    let user;
    if (token) {
      user = await User.findOne({ qr_code: token });
    } else if (register_no) {
      user = await User.findOne({ register_no });
    }

    if (!user) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (user.checked_in) {
      return NextResponse.json(
        {
          error: 'Already checked in',
          already_checked_in: true,
          student: {
            student_name: user.student_name,
            register_no: user.register_no,
            school: user.school,
            branch: user.branch,
            seat: user.seat,
            seating_category: user.seating_category,
            awards: user.awards,
          },
        },
        { status: 409 }
      );
    }

    user.checked_in = true;
    await user.save();

    return NextResponse.json({
      success: true,
      student: {
        student_name: user.student_name,
        register_no: user.register_no,
        school: user.school,
        branch: user.branch,
        program: user.program,
        seat: user.seat,
        seating_category: user.seating_category,
        awards: user.awards,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
