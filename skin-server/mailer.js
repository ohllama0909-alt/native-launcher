const https = require('https');
const fs = require('fs');
const path = require('path');

function resolveApiKey() {
  if (process.env.SENDGRID_API_KEY) return process.env.SENDGRID_API_KEY;
  const candidates = [
    path.join(process.env.NATIVE_SKIN_DATA || '', 'sendgrid.key'),
    '/home/ubuntu/.local/share/native-skin-api/sendgrid.key',
    path.join(__dirname, '..', '.env')
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const text = fs.readFileSync(p, 'utf8');
        const match = text.match(/SENDGRID_API_KEY\s*=\s*(.+)/);
        if (match) return match[1].trim();
        if (text.startsWith('SG.')) return text.trim();
      }
    } catch {}
  }
  return '';
}

const SENDGRID_API_KEY = resolveApiKey();

const DEFAULT_SENDER = {
  email: 'security@nativelaunch.xyz',
  name: 'Native Security'
};

const REPLY_TO = {
  email: 'itznavidu@gmail.com',
  name: 'Noctra Support'
};

const FOOTER_ADDRESS = 'No.27, Jayanthipura, Wekada, Panadura, 12500 LKA';

/**
 * Send an email via SendGrid v3 API using Node's native https module.
 */
function sendEmail({ to, subject, html, text, from = DEFAULT_SENDER, replyTo = REPLY_TO }) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from,
      reply_to: replyTo,
      subject,
      content: [
        ...(text ? [{ type: 'text/plain', value: text }] : []),
        { type: 'text/html', value: html }
      ]
    });

    const options = {
      hostname: 'api.sendgrid.com',
      port: 443,
      path: '/v3/mail/send',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true, statusCode: res.statusCode });
        } else {
          try {
            const parsed = JSON.parse(data);
            const msg = parsed?.errors?.[0]?.message || data || `SendGrid returned status ${res.statusCode}`;
            reject(new Error(msg));
          } catch {
            reject(new Error(`SendGrid returned status ${res.statusCode}: ${data}`));
          }
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Send a 6-digit verification code to the given email.
 */
async function sendVerificationCodeEmail(email, code, username = '') {
  const subject = `Noctra Client — Verification Code: ${code}`;
  const text = `Your Noctra verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\n${FOOTER_ADDRESS}`;
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Code</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b080c; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ece6ed; }
    .wrapper { width: 100%; max-width: 520px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #161218; border: 1px solid rgba(160, 81, 162, 0.25); border-radius: 16px; padding: 36px 28px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 10px; letter-spacing: -0.02em; }
    p { font-size: 14px; color: #a9a0ad; line-height: 1.5; margin: 0 0 24px; }
    .code-box { background: rgba(160, 81, 162, 0.12); border: 1px solid rgba(160, 81, 162, 0.35); border-radius: 12px; padding: 18px 24px; margin: 0 auto 28px; display: inline-block; }
    .code { font-family: 'SF Mono', Monaco, Menlo, 'Courier New', monospace; font-size: 36px; font-weight: 700; color: #ffffff; letter-spacing: 8px; margin: 0; }
    .expire { font-size: 12px; color: #887e8d; margin-top: 10px; margin-bottom: 0; }
    .footer { margin-top: 32px; font-size: 11px; color: #69606d; text-align: center; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <h1>Noctra Client</h1>
      <p>Hello${username ? ` <strong>${username}</strong>` : ''},<br>Use the following 6-digit verification code to complete your Noctra account setup:</p>
      
      <div class="code-box">
        <div class="code">${code}</div>
        <div class="expire">Expires in 10 minutes</div>
      </div>
      
      <p style="font-size: 12px; color: #807685; margin: 0;">If you didn't request this code, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      Noctra Client &bull; Native Security<br>
      ${FOOTER_ADDRESS}
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}

module.exports = { sendEmail, sendVerificationCodeEmail, DEFAULT_SENDER, REPLY_TO, FOOTER_ADDRESS };
