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
    subject: '🎉 Congratulations — You Are Invited to University Day',
    htmlBody: htmlBody,
    body: textBody,
    name: 'University Day Award Ceremony',
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
    'University Day Award Ceremony',
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
  var awardName = escapeHtml(
    email.awards && email.awards[0] ? email.awards[0].type : 'Award'
  );

  var awardDetails = escapeHtml(
    email.awards && email.awards[0] ? email.awards[0].details : ''
  );
  var rsvpLink = escapeHtml(email.rsvp_link || '');

  return '<!DOCTYPE html>' +
    '<html>' +
    '<head>' +
    '<meta charset="UTF-8">' +
    '<title>University Day Invitation</title>' +
    '</head>' +
    '<body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f4f6f8;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8; padding:20px;">' +
    '<tr>' +
    '<td align="center">' +
    '<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; padding:30px;">' +

    // Header
    '<tr>' +
    '<td align="center" style="padding-bottom:20px;">' +
    '<h2 style="margin:0; color:#2c3e50;">VIT Chennai</h2>' +
    '<p style="margin:5px 0 0; color:#7f8c8d;">University Day Invitation</p>' +
    '</td>' +
    '</tr>' +

    // Greeting
    '<tr>' +
    '<td style="color:#2c3e50; font-size:16px;">' +
    'Dear ' + escapeHtml(email.name || 'Student') + ',' +
    '<br><br>' +
    'Warm greetings from VIT Chennai!' +
    '<br><br>' +
    'We are pleased to congratulate you on your remarkable achievement.' +
    '</td>' +
    '</tr>' +

    // Award Section
    '<tr>' +
    '<td style="padding:15px 0; color:#2c3e50; font-size:16px;">' +
    'You have been awarded the <strong>' + awardName + '</strong>' +
    (awardDetails ? ' <span style="color:#555;">(' + awardDetails + ')</span>' : '') + '.' +
    '</td>' +
    '</tr>' +

    // Note
    '<tr>' +
    '<td style="color:#555; font-size:15px;">' +
    'Your accomplishment is highly commendable, and we take great pride in recognizing your success.' +
    '</td>' +
    '</tr>' +

    // Event Details
    '<tr>' +
    '<td style="padding-top:20px;">' +
    '<h3 style="margin-bottom:10px; color:#2c3e50;">Event Details</h3>' +
    '<p style="margin:5px 0;"><strong>Date:</strong> April 7th (Tuesday)</p>' +
    '<p style="margin:5px 0;"><strong>Time:</strong> 9:00 AM – 1:30 PM</p>' +
    '<p style="margin:5px 0;"><strong>Venue:</strong> MG Auditorium</p>' +
    '</td>' +
    '</tr>' +

    // QR Code
    '<tr>' +
    '<td style="padding-top:20px; text-align:center;">' +
    (email.qr_data ? '<img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(email.qr_data) + '" width="220" height="220" style="border:1px solid #ddd; border-radius:8px; padding:10px; background:#fff;" alt="QR Code" />' : '') +
    '</td>' +
    '</tr>' +

    // Instructions
    '<tr>' +
    '<td style="padding-top:15px; color:#555; font-size:15px;">' +
    'You are requested to assemble sharp at <strong>9:00 AM</strong> at the MG Auditorium.' +
    '<br><br>' +
    'Kindly <strong><a href="' + rsvpLink + '" style="color:#2980b9; text-decoration:none;">RSVP to confirm your attendance</a></strong>. This is mandatory, as the QR code provided will be used for entry on the day of the event.' +
    '</td>' +
    '</tr>' +

    // RSVP Button
    '<tr>' +
    '<td style="padding-top:20px; text-align:center;">' +
    '<a href="' + rsvpLink + '" style="display:inline-block; background-color:#2980b9; color:#ffffff; padding:12px 30px; text-decoration:none; border-radius:5px; font-weight:bold;">RSVP Now</a>' +
    '</td>' +
    '</tr>' +

    // Footer
    '<tr>' +
    '<td style="padding-top:30px; color:#7f8c8d; font-size:14px;">' +
    'We look forward to celebrating your achievement.' +
    '<br><br>' +
    'Warm regards,<br>' +
    '<strong>VIT Chennai</strong>' +
    '</td>' +
    '</tr>' +

    '</table>' +
    '</td>' +
    '</tr>' +
    '</table>' +

    (email.tracking_pixel ? '<img src="' + escapeHtml(email.tracking_pixel) + '" width="1" height="1" style="display:none;" />' : '') +

    '</body>' +
    '</html>';
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
