const Accident = require('../models/Accident');
const User = require('../models/User');

const reportAccident = async (req, res) => {
  try {
    const { lat, lng, description, severity } = req.body;

    const newAccident = new Accident({
      location: {
        lat,
        lng
      },
      description,
      severity,
      reportedBy: req.user // User ID from JWT in authMiddleware
    });

    const savedAccident = await newAccident.save();

    // Emit Socket.io event to all connected clients
    const io = req.app.get('io');
    if (io) {
      io.emit('newAccident', savedAccident);
    }

    res.status(201).json(savedAccident);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getAccidents = async (req, res) => {
  try {
    // Fetch all accidents and sort by latest first
    const accidents = await Accident.find().sort({ createdAt: -1 });
    res.status(200).json(accidents);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteAccident = async (req, res) => {
  try {
    // Verify admin role 
    const user = await User.findById(req.user);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    const { id } = req.params;
    const deletedAccident = await Accident.findByIdAndDelete(id);

    if (!deletedAccident) {
      return res.status(404).json({ message: 'Accident not found' });
    }

    res.status(200).json({ message: 'Accident deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  reportAccident,
  getAccidents,
  deleteAccident
};
