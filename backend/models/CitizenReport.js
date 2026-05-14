const mongoose = require('mongoose');

const citizenReportSchema = new mongoose.Schema({
  issueType: {
    type: String,
    enum: ['accident', 'pothole', 'road_damage', 'signal_failure', 'other'],
    default: 'other'
  },
  description: {
    type: String
  },
  image: {
    type: String
  },
  location: {
    lat: { type: Number },
    lng: { type: Number }
  },
  status: {
    type: String,
    enum: ['pending', 'resolved'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CitizenReport', citizenReportSchema);
