import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

// GET all users with filters
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    console.log('GET /api/users URL params:', searchParams.toString());

    const filter: Record<string, unknown> & {
      $or?: Array<Record<string, unknown>>;
    } = {};

    const awardType = searchParams.get('award_type');
    if (awardType) filter['awards.type'] = { $regex: awardType, $options: 'i' };

    const rsvp = searchParams.get('rsvp');
    if (rsvp) filter.rsvp_status = rsvp;

    const checkedIn = searchParams.get('checked_in');
    if (checkedIn === 'true' || checkedIn === 'present') filter.checked_in = true;
    else if (checkedIn === 'false' || checkedIn === 'absent') filter.checked_in = false;

    const emailStatus = searchParams.get('email_status');
    if (emailStatus === 'sent') filter['email_status.sent'] = true;
    else if (emailStatus === 'pending') filter['email_status.sent'] = false;
    else if (emailStatus === 'opened') filter['email_status.opened'] = true;
    else if (emailStatus === 'clicked') filter['email_status.clicked'] = true;

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

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limitInput = searchParams.get('limit');
    // If limit is '0', we fetch all
    const limit = limitInput === '0' ? 0 : Math.max(0, parseInt(limitInput || '50'));
    const skip = limit === 0 ? 0 : (page - 1) * limit;

    const sortField = searchParams.get('sort');
    
    // Base pipeline
    const pipeline: any[] = [{ $match: filter }];

    if (sortField === 'seating') {
      pipeline.push(
        {
          $addFields: {
            category_weight: {
              $cond: { if: { $eq: ["$seating_category", "gallery"] }, then: 1, else: 0 }
            }
          }
        },
        {
          $sort: {
            category_weight: 1,
            'seat.section': 1,
            'seat.row': 1,
            'seat.column': 1,
            register_no: 1
          }
        }
      );
    } else if (sortField === 'upload_order') {
      pipeline.push({ $sort: { upload_order: 1 } });
    } else {
      pipeline.push({ $sort: { register_no: 1 } });
    }

    // Apply pagination only if limit > 0
    if (limit > 0) {
      pipeline.push({ $skip: skip }, { $limit: limit });
    }

    console.log('Executing aggregate with pipeline length:', pipeline.length);
    const users = await User.aggregate(pipeline);
    const total = await User.countDocuments(filter);

    return NextResponse.json({ 
      users, 
      total, 
      page, 
      pages: limit === 0 ? 1 : Math.ceil(total / limit) 
    });
  } catch (error: any) {
    console.error('API Error in /api/users:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal Server Error',
        stack: error?.stack 
      },
      { status: 500 }
    );
  }
}
