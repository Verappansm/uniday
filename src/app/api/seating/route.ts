import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

// MC-oriented seating grid API — supports category + checked_in filter
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'ground';
    const checkedInParam = searchParams.get('checked_in');

    // Build query
    const query: Record<string, unknown> = { seating_category: category };
    if (checkedInParam === 'true') query.checked_in = true;
    else if (checkedInParam === 'false') query.checked_in = false;

    const students = await User.find(query)
      .select('register_no student_name school branch awards seat checked_in rsvp_status seating_category upload_order')
      // Sort by seat position for grid rendering: section → row → column
      .sort({ 'seat.section': 1, 'seat.row': 1, 'seat.column': 1 });

    return NextResponse.json({ students, total: students.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Update a student's seat
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    const { register_no, seat } = await request.json();

    const user = await User.findOneAndUpdate(
      { register_no },
      { $set: { seat } },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, student: user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
