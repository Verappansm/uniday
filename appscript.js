// App Script for Sending Mails

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, service: 'uniday-appscript', status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: 'Missing POST body' });
    }

    var data = JSON.parse(e.postData.contents);
    var emails = data.emails || [];
    var results = [];

    for (var i = 0; i < emails.length; i++) {
      var email = emails[i];
      try {
        if (!email || !email.to) {
          results.push({ to: '', status: 'failed', error: 'Missing recipient email' });
          continue;
        }

        var htmlBody = generateEmailHTML(email);
        var textBody = generateEmailText(email);

        MailApp.sendEmail({
          to: email.to,
          subject: '🎓 You\'re Invited! UniDay Award Ceremony',
          htmlBody: htmlBody,
          body: textBody,
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

    return jsonResponse({ success: true, results: results });

  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateEmailText(email) {
  var awards = Array.isArray(email.awards) ? email.awards : [];
  var awardLines = [];

  for (var i = 0; i < awards.length; i++) {
    awardLines.push('- ' + String(awards[i].type || '') + ': ' + String(awards[i].details || ''));
  }

  if (awardLines.length === 0 && email.awards_text) {
    awardLines.push('- ' + String(email.awards_text));
  }

  var lines = [
    'UniDay Award Ceremony',
    '',
    'Hello ' + String(email.name || 'Student') + ',',
    '',
    'You have been selected for the following award(s):',
    awardLines.join('\n') || '- Award',
    '',
  ];

  if (awards.length > 1) {
    lines.push(
      'Multiple awards detected. Please contact the event representative on arrival for seating and stage instructions.',
      ''
    );
  }

  lines.push(
    'Please RSVP here:',
    String(email.rsvp_link || ''),
    '',
    'Register No: ' + String(email.register_no || ''),
    '',
    'This is an automated email from UniDay Award Ceremony Management System.'
  );

  return lines.join('\n');
}

function generateEmailHTML(email) {
  var awards = Array.isArray(email.awards) ? email.awards : [];
  var awardsText = escapeHtml(email.awards_text || 'Award');
  var multiAward = awards.length > 1;
  var qrImageUrl = 'https://quickchart.io/qr?size=220&text=' + encodeURIComponent(email.qr_data || '');
  var awardListHtml = '';

  if (awards.length > 0) {
    for (var i = 0; i < awards.length; i++) {
      awardListHtml +=
        '<li style="margin:0 0 8px;color:#f0f0f5;font-size:14px;line-height:1.5;">' +
        '<strong style="text-transform:capitalize;">' + escapeHtml(awards[i].type) + '</strong>: ' + escapeHtml(awards[i].details) +
        '</li>';
    }
  } else {
    awardListHtml = '<li style="margin:0;color:#f0f0f5;font-size:14px;line-height:1.5;">' + awardsText + '</li>';
  }

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
    '<p style="color:#f0f0f5;font-size:18px;margin:0 0 8px;">Hello <strong>' + escapeHtml(email.name) + '</strong>,</p>' +
    '<p style="color:#8b8ba3;font-size:14px;line-height:1.6;margin:0 0 24px;">You have been selected for the following award(s) at our university ceremony:</p>' +

    // Awards
    '<div style="background:#1c1c28;border:1px solid #2d2d4a;border-radius:12px;padding:16px;margin-bottom:24px;">' +
    '<p style="color:#818cf8;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;font-weight:bold;">Your Award(s)</p>' +
    '<ul style="padding-left:18px;margin:0;">' + awardListHtml + '</ul>' +
    '</div>' +

    (multiAward
      ? '<div style="background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.28);border-radius:12px;padding:14px 16px;margin-bottom:24px;">' +
        '<p style="color:#fbbf24;font-size:13px;line-height:1.6;margin:0;"><strong>Multiple awards detected.</strong> Please contact the event representative on arrival for seating and stage instructions.</p>' +
        '</div>'
      : '') +

    '<p style="color:#8b8ba3;font-size:14px;line-height:1.6;margin:0 0 24px;">Please RSVP to confirm your attendance. Your seat assignment and QR code for event-day check-in will be available after confirming.</p>' +

    // CTA Button
    '<div style="text-align:center;margin:32px 0;">' +
    '<a href="' + escapeHtml(email.rsvp_link) + '" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#7c3aed);color:white;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:bold;font-size:16px;">RSVP Now</a>' +
    '</div>' +

    '<div style="background:#ffffff;border-radius:16px;padding:18px;margin:0 auto 20px;max-width:260px;text-align:center;">' +
    '<img src="' + qrImageUrl + '" alt="QR Code" width="220" height="220" style="display:block;margin:0 auto 10px;" />' +
    '<p style="color:#111827;font-size:12px;line-height:1.5;margin:0;">Use this QR code for event-day verification after RSVP confirmation.</p>' +
    '</div>' +

    '<p style="color:#5b5b73;font-size:12px;text-align:center;margin:24px 0 0;">Register No: ' + escapeHtml(email.register_no) + '</p>' +
    '</div>' +

    // Footer
    '<div style="padding:20px 30px;border-top:1px solid #1e1e2e;text-align:center;">' +
    '<p style="color:#5b5b73;font-size:11px;margin:0;">This is an automated email from UniDay Award Ceremony Management System.</p>' +
    '</div>' +

    '</div>' +

    // Tracking pixel
    (email.tracking_pixel
      ? '<img src="' + escapeHtml(email.tracking_pixel) + '" width="1" height="1" style="display:none;" />'
      : '') +

    '</body></html>';
}

// Test function
function testEmail() {
  var testData = {
    to: 'test@example.com',
    name: 'Test Student',
    register_no: 'REG001',
    awards: [{ type: 'merit', details: 'Rank 1' }],
    awards_text: 'Merit: Rank 1',
    rsvp_link: 'https://example.com/rsvp/test-token',
    tracking_pixel: 'https://example.com/api/track/open/test-token',
    qr_data: 'test-token',
  };

  Logger.log(generateEmailHTML(testData));
}
