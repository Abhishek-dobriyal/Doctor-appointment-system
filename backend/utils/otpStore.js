/**
 * In-memory OTP simulation for 2FA demo (not for production scale).
 * Maps email -> { code, expiresAt }
 */
const store = new Map();

const TTL_MS = 5 * 60 * 1000;

function setOtp(email, code) {
  store.set(email.toLowerCase(), { code: String(code), expiresAt: Date.now() + TTL_MS });
}

function verifyAndConsume(email, code) {
  const key = email.toLowerCase();
  const entry = store.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return false;
  }
  if (entry.code !== String(code)) return false;
  store.delete(key);
  return true;
}

module.exports = { setOtp, verifyAndConsume };
