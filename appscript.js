/**
 * UniDay Email Service — Google AppScript
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://script.google.com
 * 2. Create a new project
 * 3. Paste this entire code into the editor
 * 4. Click Deploy > New Deployment
 * 5. Choose "Web app"
 * 6. Set "Execute as" = "Me"
 * 7. Set "Who has access" = "Anyone"
 * 8. Click Deploy and copy the URL
 * 9. Paste the URL into your .env.local as APPSCRIPT_URL
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var emails = data.emails;
    var results = [];

    for (var i = 0; i < emails.length; i++) {
      var email = emails[i];
      try {
        var htmlBody = generateEmailHTML(email);

        MailApp.sendEmail({
          to: email.to,
          subject: '🎓 You\'re Invited! UniDay Award Ceremony',
          htmlBody: htmlBody,
          name: 'UniDay Award Ceremony',
        });

        results.push({ to: email.to, status: 'sent' });
      } catch (err) {
        results.push({ to: email.to, status: 'failed', error: err.toString() });
      }

      // Small delay to avoid rate limiting
      if (i < emails.length - 1) {
        Utilities.sleep(100);
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, results: results }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function generateEmailHTML(email) {
  var awards = email.awards || 'Award';

  return '<!DOCTYPE html>' +
    '<html>' +
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>' +
    '<body style="margin:0;padding:0;background:#0a0a0f;font-family:Arial,sans-serif;">' +
    '<div style="max-width:600px;margin:0 auto;background:#12121a;border-radius:16px;overflow:hidden;margin-top:20px;margin-bottom:20px;">' +

    // Header
    '<div style="background:linear-gradient(135deg,#6366f1,#7c3aed);padding:40px 30px;text-align:center;">' +
    '<h1 style="color:white;margin:0;font-size:28px;">🎓 UniDay</h1>' +
    '<p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Award Ceremony Invitation</p>' +
    '</div>' +

    // Body
    '<div style="padding:30px;">' +
    '<p style="color:#f0f0f5;font-size:18px;margin:0 0 8px;">Hello <strong>' + email.name + '</strong>,</p>' +
    '<p style="color:#8b8ba3;font-size:14px;line-height:1.6;margin:0 0 24px;">You have been selected for the following award(s) at our university ceremony:</p>' +

    // Awards
    '<div style="background:#1c1c28;border:1px solid #2d2d4a;border-radius:12px;padding:16px;margin-bottom:24px;">' +
    '<p style="color:#818cf8;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;font-weight:bold;">Your Award(s)</p>' +
    '<p style="color:#f0f0f5;font-size:16px;font-weight:bold;margin:0;">🏆 ' + awards + '</p>' +
    '</div>' +

    '<p style="color:#8b8ba3;font-size:14px;line-height:1.6;margin:0 0 24px;">Please RSVP to confirm your attendance. Your seat assignment and QR code for event-day check-in will be available after confirming.</p>' +

    // CTA Button
    '<div style="text-align:center;margin:32px 0;">' +
    '<a href="' + email.rsvp_link + '" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#7c3aed);color:white;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:bold;font-size:16px;">RSVP Now</a>' +
    '</div>' +

    '<p style="color:#5b5b73;font-size:12px;text-align:center;margin:24px 0 0;">Register No: ' + email.register_no + '</p>' +
    '</div>' +

    // Footer
    '<div style="padding:20px 30px;border-top:1px solid #1e1e2e;text-align:center;">' +
    '<p style="color:#5b5b73;font-size:11px;margin:0;">This is an automated email from UniDay Award Ceremony Management System.</p>' +
    '</div>' +

    '</div>' +

    // Tracking pixel
    '<img src="' + email.tracking_pixel + '" width="1" height="1" style="display:none;" />' +

    '</body></html>';
}

// Test function
function testEmail() {
  var testData = {
    to: 'test@example.com',
    name: 'Test Student',
    register_no: 'REG001',
    awards: 'Merit: Rank 1',
    rsvp_link: 'https://example.com/rsvp/test-token',
    tracking_pixel: 'https://example.com/api/track/open/test-token',
  };

  Logger.log(generateEmailHTML(testData));
}
