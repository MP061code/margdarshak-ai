const mongoose = require('mongoose');

const citizenReportSchema = new mongoose.Schema({
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
