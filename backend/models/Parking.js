const mongoose = require('mongoose');

const parkingSchema = new mongoose.Schema({
  location: {
    lat: { type: Number },
    lng: { type: Number }
  },
  totalSlots: {
    type: Number
  },
  availableSlots: {
    type: Number
  }
});

module.exports = mongoose.model('Parking', parkingSchema);
