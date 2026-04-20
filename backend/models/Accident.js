const mongoose = require('mongoose');

const accidentSchema = new mongoose.Schema({
  location: {
    lat: { type: Number },
    lng: { type: Number }
  },
  description: {
    type: String
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high']
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Accident', accidentSchema);
