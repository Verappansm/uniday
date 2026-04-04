import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

// GET all users with filters
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);

    const filter: Record<string, unknown> & {
      $or?: Array<Record<string, unknown>>;
    } = {};

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
    const limitParam = parseInt(searchParams.get('limit') || '50');
    const limit = limitParam === 0 ? 0 : limitParam; // 0 means fetch all
    const skip = limit === 0 ? 0 : (page - 1) * limit;

    const sortField = searchParams.get('sort');
    const sortObj: Record<string, 1 | -1> =
      sortField === 'upload_order' ? { upload_order: 1 } : { register_no: 1 };

    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(limit).sort(sortObj),
      User.countDocuments(filter),
    ]);

    return NextResponse.json({ users, total, page, pages: limit === 0 ? 1 : Math.ceil(total / limit) });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load users' },
      { status: 500 }
    );
  }
}
