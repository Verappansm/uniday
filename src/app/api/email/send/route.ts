import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

export async function POST() {
  try {
    await dbConnect();

    const users = await User.find({
      'email_status.sent': false,
      email: { $exists: true, $ne: '' },
    }).limit(100);

    if (users.length === 0) {
      return NextResponse.json({ message: 'No pending emails', sent: 0 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const appscriptUrl = process.env.APPSCRIPT_URL;

    if (!appscriptUrl) {
      return NextResponse.json({ error: 'APPSCRIPT_URL not configured' }, { status: 500 });
    }

    const emailPayload = users.map((user) => ({
      to: user.email,
      name: user.student_name,
      register_no: user.register_no,
      awards: user.awards.map((award: { type: string; details: string }) => ({
        type: award.type,
        details: award.details,
      })),
      awards_text: user.awards
        .map((award: { type: string; details: string }) => `${award.type}: ${award.details}`)
        .join(', '),
      rsvp_link: `${appUrl}/rsvp/${user.qr_code}`,
      tracking_pixel: `${appUrl}/api/track/open/${user.qr_code}`,
      qr_data: user.qr_code,
      qr_image_url: `${appUrl}/api/track/open/${user.qr_code}`,
    }));

    // Send to AppScript
    const response = await fetch(appscriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails: emailPayload }),
    });

    if (!response.ok) {
      throw new Error(`AppScript returned ${response.status}`);
    }

    const responseData = (await response.json()) as {
      success?: boolean;
      results?: Array<{ to: string; status: string; error?: string }>;
      error?: string;
    };

    if (!responseData.success) {
      throw new Error(responseData.error || 'AppScript email send failed');
    }

    const sentAddresses = new Set(
      (responseData.results || [])
        .filter((result) => result.status === 'sent')
        .map((result) => result.to.toLowerCase())
    );

    const sentIds = users
      .filter((user) => sentAddresses.has(user.email.toLowerCase()))
      .map((user) => user._id);

    const sentRecipients = users
      .filter((user) => sentAddresses.has(user.email.toLowerCase()))
      .map((user) => ({
        register_no: user.register_no,
        student_name: user.student_name,
        email: user.email,
      }));

    if (sentIds.length > 0) {
      await User.updateMany(
        { _id: { $in: sentIds } },
        {
          $set: {
            'email_status.sent': true,
            'email_status.sent_at': new Date(),
          },
        }
      );
    }

    const failed = (responseData.results || []).filter((result) => result.status !== 'sent');

    return NextResponse.json({
      success: true,
      attempted: users.length,
      sent: sentIds.length,
      failed: failed.length,
      sent_recipients: sentRecipients,
      failures: failed,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Email sending failed' },
      { status: 500 }
    );
  }
}
