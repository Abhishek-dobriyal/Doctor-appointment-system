require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');
const prescriptionController = require('./controllers/prescriptionController');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const projectRoutes = require('./routes/projectRoutes');
const healthRoutes = require('./routes/healthRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

const frontendDir = path.join(__dirname, '..', 'frontend');

app.use(
  cors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Mock prescription "PDF" (HTML) — token is unguessable random string
app.get('/api/prescriptions/pdf/:token', prescriptionController.mockPdfPage);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/admin', adminRoutes);

app.use(express.static(frontendDir));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendDir, 'index.html'), (err) => {
    if (err) next();
  });
});

app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'Not found' });
  }
  res.status(404).send('Not found');
});

app.use((err, req, res, next) => {
  if (err && err.message === 'Only PDF, images, and plain text files are allowed') {
    return res.status(400).json({ message: err.message });
  }
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large' });
  }
  errorHandler(err, req, res, next);
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server http://localhost:${PORT}`);
      console.log(`Frontend served from ${frontendDir}`);
    });
  })
  .catch((e) => {
    console.error('Failed to start', e);
    process.exit(1);
  });
