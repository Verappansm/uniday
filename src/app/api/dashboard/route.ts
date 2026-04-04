import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const [
      totalStudents,
      groundStudents,
      galleryStudents,
      emailsSent,
      emailsOpened,
      emailsClicked,
      rsvpYes,
      rsvpNo,
      rsvpPending,
      checkedIn,
      awardStats,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ seating_category: 'ground' }),
      User.countDocuments({ seating_category: 'gallery' }),
      User.countDocuments({ 'email_status.sent': true }),
      User.countDocuments({ 'email_status.opened': true }),
      User.countDocuments({ 'email_status.clicked': true }),
      User.countDocuments({ rsvp_status: 'yes' }),
      User.countDocuments({ rsvp_status: 'no' }),
      User.countDocuments({ rsvp_status: null }),
      User.countDocuments({ checked_in: true }),
      User.aggregate([
        { $unwind: '$awards' },
        { $group: { _id: '$awards.type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    return NextResponse.json({
      total: totalStudents,
      ground: groundStudents,
      gallery: galleryStudents,
      email: { sent: emailsSent, opened: emailsOpened, clicked: emailsClicked },
      rsvp: { yes: rsvpYes, no: rsvpNo, pending: rsvpPending },
      attendance: { checkedIn, total: totalStudents },
      awardStats,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
