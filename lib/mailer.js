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

async function sendWelcomeEmail(toEmail, userName) {
  const mailer = getTransporter()
  const from = '"ScholarHub" <scholarhubng1@gmail.com>'
  const name = userName || 'Scholar'

  const html = `
    <div style="max-width: 580px; margin: 0 auto; font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 36px;">
      <div style="text-align: center; margin-bottom: 28px;">
        <h1 style="color: #10b981; margin: 0; font-size: 32px; font-weight: 900; letter-spacing: -0.5px;">Scholar<span style="color: #059669;">Hub</span></h1>
        <p style="color: #6b7280; font-size: 14px; font-weight: 600; margin-top: 6px;">Global Social Learning & Academic Network</p>
      </div>

      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; padding: 24px; text-align: center; color: #ffffff; margin-bottom: 28px;">
        <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800;">Welcome to ScholarHub, ${name}!</h2>
        <p style="margin: 0; font-size: 14px; opacity: 0.95; line-height: 1.5;">Your account has been officially verified and activated. We are thrilled to have you join our global community of scholars, students, and leaders.</p>
      </div>

      <div style="color: #374151; font-size: 15px; line-height: 1.6; margin-bottom: 28px;">
        <p style="margin-top: 0;">Here are a few features you can explore right now on ScholarHub:</p>
        
        <div style="background-color: #f9fafb; border-left: 4px solid #10b981; border-radius: 6px; padding: 16px; margin-bottom: 12px;">
          <strong style="color: #10b981;">Explore Academic Feeds & Communities</strong>
          <span style="color: #6b7280; display: block; font-size: 13px; margin-top: 4px;">Connect with fellow students, join study guilds, and share insights across science, tech, arts, and executive leadership.</span>
        </div>

        <div style="background-color: #f9fafb; border-left: 4px solid #10b981; border-radius: 6px; padding: 16px; margin-bottom: 12px;">
          <strong style="color: #10b981;">AI Study Assistant</strong>
          <span style="color: #6b7280; display: block; font-size: 13px; margin-top: 4px;">Use your built-in AI Study Assistant to research topics, generate study guides, and get instant homework help.</span>
        </div>

        <div style="background-color: #f9fafb; border-left: 4px solid #10b981; border-radius: 6px; padding: 16px; margin-bottom: 12px;">
          <strong style="color: #10b981;">Earn Scholar Coins & Badges</strong>
          <span style="color: #6b7280; display: block; font-size: 13px; margin-top: 4px;">Post questions, help peers, maintain daily study streaks, and level up your scholar rank on the Global Leaderboard.</span>
        </div>
      </div>

      <div style="text-align: center; margin-bottom: 28px;">
        <a href="https://scholarhub-web.vercel.app/feed" style="background-color: #10b981; color: #ffffff; text-decoration: none; font-weight: 800; font-size: 15px; padding: 14px 32px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);">
          Start Exploring ScholarHub &rarr;
        </a>
      </div>

      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 28px 0;" />
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
        Need assistance? Reply directly to this email or visit our Help Center.<br/>
        &copy; ${new Date().getFullYear()} ScholarHub Inc. All rights reserved.
      </p>
    </div>
  `

  try {
    const info = await mailer.sendMail({
      from,
      to: toEmail,
      subject: `Welcome to ScholarHub, ${name}! Explore your learning network`,
      html,
    })
    console.log(`[WELCOME EMAIL SUCCESS] Sent welcome email to ${toEmail}: ${info.messageId}`)
    return info
  } catch (err) {
    console.error(`[WELCOME EMAIL ERROR] Could not send welcome email to ${toEmail}:`, err.message)
    return { error: err.message }
  }
}

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
}
