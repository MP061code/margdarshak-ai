const mongoose = require('mongoose');

const emergencyEventSchema = new mongoose.Schema({
  routeGeoJSON: {
    type: mongoose.Schema.Types.Mixed, // Storing full GeoJSON geometry from OSRM
    required: true
  },
  sourceName: String,
  destName: String,
  distanceText: String,
  etaText: String,
  trafficStatus: String,
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
