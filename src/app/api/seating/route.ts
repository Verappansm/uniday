import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { buildFullSeatGrid, buildSectionGrid } from '@/lib/seating';
import { requireRole } from '@/lib/auth';

// MC-oriented seating grid API — supports category + checked_in filter
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(request, ['admin', 'volunteer', 'mc']);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'ground';
    const checkedInParam = searchParams.get('checked_in');
    const section = searchParams.get('section');

    // Build query
    const query: Record<string, unknown> = { seating_category: category };
    if (checkedInParam === 'true') query.checked_in = true;
    else if (checkedInParam === 'false') query.checked_in = false;
    if (section) query['seat.section'] = section;

    const students = await User.find(query)
      .select('register_no student_name school branch awards seat checked_in rsvp_status seating_category upload_order')
      // Sort by seat position for grid rendering: section → row → column
      .sort({ 'seat.section': 1, 'seat.row': 1, 'seat.column': 1 });

    return NextResponse.json({
      students,
      total: students.length,
      grid: section ? buildSectionGrid(students, section) : buildFullSeatGrid(students),
      viewer_role: session.role,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load seating' },
      { status: 500 }
    );
  }
}

// Update a student's seat
export async function PUT(request: NextRequest) {
  try {
    const session = await requireRole(request, ['admin']);
    if (!session) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update seat' },
      { status: 500 }
    );
  }
}
