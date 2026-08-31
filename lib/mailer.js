const nodemailer = require('nodemailer')

let transporter = null

function getTransporter() {
  if (transporter) return transporter

  const user = 'scholarhubng1@gmail.com'
  const pass = 'vbjfxgglwesovbpc' // Fresh 16-character Google App Password

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false
    }
  })
  return transporter
}

async function sendVerificationEmail(toEmail, otpCode) {
  const mailer = getTransporter()
  const from = '"ScholarHub Security" <scholarhubng1@gmail.com>'

  const html = `
    <div style="max-width: 500px; margin: 0 auto; font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #10b981; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Scholar<span style="color: #059669;">Hub</span></h1>
        <p style="color: #6b7280; font-size: 13px; font-weight: 600; margin-top: 4px;">Global Social Learning Network</p>
      </div>

      <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="color: #374151; font-size: 14px; margin-top: 0; margin-bottom: 12px; font-weight: 600;">Your Security Verification Code</p>
        <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #10b981; font-family: monospace; background: #ffffff; padding: 12px 20px; border-radius: 8px; display: inline-block; border: 1px dashed #10b981;">
          ${otpCode}
        </div>
        <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0; margin-top: 12px;">This code is valid for <strong>10 minutes</strong>. Never share this code with anyone.</p>
      </div>

      <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin-bottom: 20px;">
        If you did not request this verification code, please ignore this email or contact support.
      </p>

      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 11px; text-align: center; margin: 0;">
        &copy; ${new Date().getFullYear()} ScholarHub Inc. All rights reserved.
      </p>
    </div>
  `

  try {
    const info = await mailer.sendMail({
      from,
      to: toEmail,
      subject: `${otpCode} is your ScholarHub Verification Code`,
      html,
    })
    console.log(`[MAILER SUCCESS] Sent verification OTP ${otpCode} to ${toEmail}: ${info.messageId}`)
    return info
  } catch (err) {
    console.error(`[MAILER ERROR] Failed to send email to ${toEmail}:`, err.message)
    return { error: err.message }
  }
}

module.exports = {
  sendVerificationEmail,
}
