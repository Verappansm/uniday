import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

// RSVP submission
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { token, rsvp_status, rsvp_reason } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const user = await User.findOne({ qr_code: token });
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
    }

    user.rsvp_status = rsvp_status;
    if (rsvp_status === 'no' && rsvp_reason) {
      user.rsvp_reason = rsvp_reason;
    }
    await user.save();

    return NextResponse.json({
      success: true,
      student: {
        student_name: user.student_name,
        register_no: user.register_no,
        email: user.email,
        awards: user.awards,
        rsvp_status: user.rsvp_status,
        rsvp_reason: user.rsvp_reason,
        seat: user.seat,
        seating_category: user.seating_category,
        school: user.school,
        program: user.program,
        branch: user.branch,
        batch: user.batch,
        qr_code: user.qr_code,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'RSVP failed' },
      { status: 500 }
    );
  }
}

// GET student by token (for RSVP page)
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const user = await User.findOne({ qr_code: token });
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
    }

    // Mark click tracking
    if (!user.email_status.clicked) {
      user.email_status.clicked = true;
      user.email_status.clicked_at = new Date();
      await user.save();
    }

    return NextResponse.json({
      student: {
        student_name: user.student_name,
        register_no: user.register_no,
        email: user.email,
        school: user.school,
        program: user.program,
        branch: user.branch,
        batch: user.batch,
        awards: user.awards,
        rsvp_status: user.rsvp_status,
        seat: user.seat,
        seating_category: user.seating_category,
        qr_code: user.qr_code,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load RSVP' },
      { status: 500 }
    );
  }
}
