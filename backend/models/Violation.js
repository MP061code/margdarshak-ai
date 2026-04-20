const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema({
  vehicleNumber: {
    type: String
  },
  violationType: {
    type: String
  },
  fine: {
    type: Number
  },
  image: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Violation', violationSchema);
