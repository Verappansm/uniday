import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

// Get all students for seating map
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'ground';

    const students = await User.find({ seating_category: category })
      .select('register_no student_name school branch awards seat checked_in rsvp_status seating_category')
      .sort({ register_no: 1 });

    return NextResponse.json({ students });
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
