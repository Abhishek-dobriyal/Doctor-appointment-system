const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Project = require('../models/Project');

async function stats(req, res, next) {
  try {
    const [patients, doctors, admins, appointments, projectsActive] = await Promise.all([
      User.countDocuments({ role: 'patient' }),
      User.countDocuments({ role: 'doctor' }),
      User.countDocuments({ role: 'admin' }),
      Appointment.countDocuments({}),
      Project.countDocuments({ status: 'active' }),
    ]);
    res.json({
      users: {
        patients,
        doctors,
        admins,
        total: patients + doctors + admins,
      },
      appointments,
      activeProjects: projectsActive,
    });
  } catch (err) {
    next(err);
  }
}

/** Simple CSV export: users + appointments summary */
async function exportCsv(req, res, next) {
  try {
    const users = await User.find({}).select('email role name createdAt').lean();
    const appts = await Appointment.find({})
      .populate('patient', 'email')
      .populate('doctor', 'email')
      .limit(500)
      .lean();

    const esc = (v) => {
      const s = v == null ? '' : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    let csv = 'type,email,role,name,extra,createdAt\n';
    for (const u of users) {
      csv += `user,${esc(u.email)},${esc(u.role)},${esc(u.name)},,${esc(u.createdAt)}\n`;
    }
    for (const a of appts) {
      csv += `appointment,${esc(a.patient?.email)},,${esc(a.status)},doctor:${esc(a.doctor?.email)},${esc(a.startTime)}\n`;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="report-mock.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

module.exports = { stats, exportCsv };
