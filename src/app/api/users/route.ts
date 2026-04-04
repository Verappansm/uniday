import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

// GET all users with filters
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);

    const filter: any = {};

    const awardType = searchParams.get('award_type');
    if (awardType) filter['awards.type'] = { $regex: awardType, $options: 'i' };

    const rsvp = searchParams.get('rsvp');
    if (rsvp) filter.rsvp_status = rsvp;

    const checkedIn = searchParams.get('checked_in');
    if (checkedIn) filter.checked_in = checkedIn === 'true';

    const category = searchParams.get('category');
    if (category) filter.seating_category = category;

    const search = searchParams.get('search');
    if (search) {
      filter.$or = [
        { student_name: { $regex: search, $options: 'i' } },
        { register_no: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(limit).sort({ register_no: 1 }),
      User.countDocuments(filter),
    ]);

    return NextResponse.json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
