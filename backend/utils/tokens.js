const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function signAccessToken(userId, role) {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '8h';
  return jwt.sign({ sub: userId, role }, secret, { expiresIn });
}

function signOtpChallengeToken(userId) {
  const secret = process.env.JWT_SECRET;
  return jwt.sign({ sub: userId, otpChallenge: true }, secret, { expiresIn: '10m' });
}

function verifyOtpChallengeToken(token) {
  const secret = process.env.JWT_SECRET;
  const payload = jwt.verify(token, secret);
  if (!payload.otpChallenge) {
    const e = new Error('Invalid challenge token');
    e.statusCode = 401;
    throw e;
  }
  return payload;
}

function randomOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

module.exports = { signAccessToken, signOtpChallengeToken, verifyOtpChallengeToken, randomOtp };
