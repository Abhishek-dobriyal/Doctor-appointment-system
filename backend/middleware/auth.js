const jwt = require('jsonwebtoken');
const User = require('../models/User');

const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Verifies JWT, loads user, enforces 30-minute inactivity timeout.
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const token = header.slice(7);
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ message: 'Server misconfiguration' });
    }
    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or disabled' });
    }
    const now = Date.now();
    const last = user.lastActivity ? new Date(user.lastActivity).getTime() : 0;
    if (now - last > INACTIVITY_MS) {
      return res.status(401).json({ message: 'Session expired due to inactivity. Please log in again.' });
    }
    user.lastActivity = new Date();
    await user.save({ validateBeforeUpdate: false });
    req.user = user;
    req.tokenPayload = payload;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Restricts route to given roles after requireAuth.
 */
function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRoles, INACTIVITY_MS };
