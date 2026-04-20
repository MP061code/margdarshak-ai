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
