/**
 * One-time: create admin user from env.
 * Usage: node scripts/seedAdmin.js
 * Requires MONGODB_URI, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD in .env
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');

async function run() {
  const uri = process.env.MONGODB_URI;
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!uri || !email || !password) {
    console.error('Set MONGODB_URI, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD in .env');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.log('User already exists:', email);
    process.exit(0);
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({
    email: email.toLowerCase(),
    passwordHash,
    role: 'admin',
    name: 'System Admin',
  });
  console.log('Admin created:', email);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
