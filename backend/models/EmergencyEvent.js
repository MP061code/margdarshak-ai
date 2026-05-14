const mongoose = require('mongoose');

const emergencyEventSchema = new mongoose.Schema({
  routePath: {
    type: [[Number]], // Array of [lat, lng] arrays
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'cleared'],
    default: 'active'
  },
  activatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('EmergencyEvent', emergencyEventSchema);
