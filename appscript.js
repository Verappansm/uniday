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
    '<meta name="color-scheme" content="light dark">' +
    '<title>University Day Invitation</title>' +
    '<style>' +
    '@media (prefers-color-scheme: dark) {' +
    'body { background-color: #1a1a1a !important; }' +
    '.email-outer { background-color: #1a1a1a !important; }' +
    '.email-container { background: #2d2d2d !important; }' +
    '.email-header { color: #e0e0e0 !important; }' +
    '.email-header-subtitle { color: #a0a0a0 !important; }' +
    '.email-text { color: #e0e0e0 !important; }' +
    '.email-text-secondary { color: #b0b0b0 !important; }' +
    '.email-text-muted { color: #555555 !important; }' +
    '.event-details { color: #e0e0e0 !important; }' +
    '.event-detail-text { color: #c0c0c0 !important; }' +
    '.email-link { color: #8a8a8a !important; }' +
    '.email-button { background-color: #505050 !important; border: 1px solid #707070 !important; }' +
    '.email-footer { color: #707070 !important; }' +
    '.qr-container { border-color: #5a5a5a !important; background: #3a3a3a !important; filter: grayscale(100%); }' +
    '}' +
    '</style>' +
    '</head>' +
    '<body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f5f5f5;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" class="email-outer" style="background-color:#f5f5f5; padding:20px;">' +
    '<tr>' +
    '<td align="center">' +
    '<table width="600" cellpadding="0" cellspacing="0" class="email-container" style="background:#ffffff; border-radius:8px; padding:30px; box-shadow:0 2px 8px rgba(0,0,0,0.1);">' +

    // Header
    '<tr>' +
    '<td align="center" style="padding-bottom:20px;">' +
    '<h2 class="email-header" style="margin:0; color:#2c3e50;">VIT Chennai</h2>' +
    '<p class="email-header-subtitle" style="margin:5px 0 0; color:#7f8c8d;">University Day Invitation</p>' +
    '</td>' +
    '</tr>' +

    // Greeting
    '<tr>' +
    '<td class="email-text" style="color:#2c3e50; font-size:16px;">' +
    'Dear ' + escapeHtml(email.name || 'Student') + ',' +
    '<br><br>' +
    'Warm greetings from VIT Chennai!' +
    '<br><br>' +
    'We are pleased to congratulate you on your remarkable achievement.' +
    '</td>' +
    '</tr>' +

    // Award Section
    '<tr>' +
    '<td class="email-text" style="padding:15px 0; color:#2c3e50; font-size:16px;">' +
    'You have been awarded the <strong>' + awardName + '</strong>' +
    (awardDetails ? ' <span class="email-text-muted" style="color:#555555;">(' + awardDetails + ')</span>' : '') + '.' +
    '</td>' +
    '</tr>' +

    // Note
    '<tr>' +
    '<td class="email-text-secondary" style="color:#555555; font-size:15px;">' +
    'Your accomplishment is highly commendable, and we take great pride in recognizing your success.' +
    '</td>' +
    '</tr>' +

    // Event Details
    '<tr>' +
    '<td style="padding-top:20px;">' +
    '<h3 class="event-details" style="margin-bottom:10px; color:#2c3e50;">Event Details</h3>' +
    '<p class="event-detail-text" style="margin:5px 0; color:#34495e;"><strong>Date:</strong> April 7th (Tuesday)</p>' +
    '<p class="event-detail-text" style="margin:5px 0; color:#34495e;"><strong>Time:</strong> 9:00 AM – 1:30 PM</p>' +
    '<p class="event-detail-text" style="margin:5px 0; color:#34495e;"><strong>Venue:</strong> MG Auditorium</p>' +
    '</td>' +
    '</tr>' +

    // QR Code
    '<tr>' +
    '<td style="padding-top:20px; text-align:center;">' +
    (email.qr_data ? '<img class="qr-container" src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(email.qr_data) + '" width="220" height="220" style="border:2px solid #bdc3c7; border-radius:8px; padding:10px; background:#ffffff;" alt="QR Code" />' : '') +
    '</td>' +
    '</tr>' +

    // Instructions
    '<tr>' +
    '<td class="email-text-secondary" style="padding-top:15px; color:#555555; font-size:15px;">' +
    'You are requested to assemble sharp at <strong>9:00 AM</strong> at the MG Auditorium.' +
    '<br><br>' +
    'Kindly <strong><a class="email-link" href="' + rsvpLink + '" style="color:#0066cc; text-decoration:none;">RSVP to confirm your attendance</a></strong>. This is mandatory, as the QR code provided will be used for entry on the day of the event.' +
    '</td>' +
    '</tr>' +

    // RSVP Button
    '<tr>' +
    '<td style="padding-top:20px; text-align:center;">' +
    '<a class="email-button" href="' + rsvpLink + '" style="display:inline-block; background-color:#0066cc; color:#ffffff; padding:12px 30px; text-decoration:none; border-radius:5px; font-weight:bold; border:none;">RSVP Now</a>' +
    '</td>' +
    '</tr>' +

    // Footer
    '<tr>' +
    '<td class="email-footer" style="padding-top:30px; color:#7f8c8d; font-size:14px;">' +
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
