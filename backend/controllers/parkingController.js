const Parking = require('../models/Parking');

exports.getParking = async (req, res) => {
  try {
    const parking = await Parking.find();
    res.json(parking);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.updateParking = async (req, res) => {
  try {
    const { lat, lng, totalSlots, availableSlots } = req.body;

    // For simplicity of update, check if one at this location exists approx
    let parking = await Parking.findOne({ "location.lat": lat, "location.lng": lng });
    
    if (parking) {
       parking.availableSlots = availableSlots;
       parking.totalSlots = totalSlots;
       await parking.save();
    } else {
       parking = new Parking({ location: { lat, lng }, totalSlots, availableSlots });
       await parking.save();
    }

    const io = req.app.get('io');
    if (io) io.emit('parkingUpdated', parking);
    
    res.json(parking);
  } catch (error) { res.status(500).json({ error: error.message }); }
};
