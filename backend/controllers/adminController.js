const User = require('../models/User');
const Accident = require('../models/Accident');
const CitizenReport = require('../models/CitizenReport');
const Violation = require('../models/Violation');

exports.getStats = async (req, res) => {
  try {
    // Admin RBAC verification
    const user = await User.findById(req.user);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin privilege required' });
    }

    // Execute multiple Mongoose aggregations concurrently for speed
    const [totalUsers, totalAccidents, totalCitizenReports, totalViolations] = await Promise.all([
      User.countDocuments(),
      Accident.countDocuments(),
      CitizenReport.countDocuments(),
      Violation.countDocuments()
    ]);

    res.status(200).json({
      totalUsers,
      totalAccidents,
      totalCitizenReports,
      totalViolations
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const EmergencyEvent = require('../models/EmergencyEvent');

exports.activateEmergency = async (req, res) => {
  try {
    const user = await User.findById(req.user);
    if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

    const { routePath } = req.body;
    
    // Deactivate previous
    await EmergencyEvent.updateMany({ status: 'active' }, { status: 'cleared' });

    const newEmergency = new EmergencyEvent({ routePath, activatedBy: req.user });
    await newEmergency.save();

    const io = req.app.get('io');
    if (io) io.emit('emergencyActivated', newEmergency);

    res.status(201).json(newEmergency);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.clearEmergency = async (req, res) => {
  try {
    const user = await User.findById(req.user);
    if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

    await EmergencyEvent.updateMany({ status: 'active' }, { status: 'cleared' });

    const io = req.app.get('io');
    if (io) io.emit('emergencyCleared');

    res.status(200).json({ message: 'All emergencies cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
