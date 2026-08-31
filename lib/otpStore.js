// Global OTP store map for serverless execution
if (!global.__scholarhub_otp_store) {
  global.__scholarhub_otp_store = new Map()
}

const otpStore = global.__scholarhub_otp_store

function saveOTP(email, phone, code) {
  const cleanEmail = email.trim().toLowerCase()
  const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes
  otpStore.set(cleanEmail, { phone: phone || '', code, expiresAt, used: false })
}

function verifyOTP(email, code) {
  const cleanEmail = email.trim().toLowerCase()
  const record = otpStore.get(cleanEmail)
  
  if (!record) {
    return { valid: false, message: 'No verification code found for this email. Please request a new code.' }
  }

  if (record.used) {
    return { valid: false, message: 'This code has already been used. Please request a new verification code.' }
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(cleanEmail)
    return { valid: false, message: 'Verification code has expired. Please request a new code.' }
  }

  if (record.code !== code.trim()) {
    return { valid: false, message: 'Invalid 6-digit verification code. Please check your email and try again.' }
  }

  record.used = true
  return { valid: true, message: 'OTP verified successfully' }
}

module.exports = {
  saveOTP,
  verifyOTP,
}
