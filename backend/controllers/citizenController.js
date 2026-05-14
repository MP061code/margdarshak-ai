const CitizenReport = require('../models/CitizenReport');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });
exports.uploadMiddleware = upload.single('image');

exports.reportIssue = async (req, res) => {
  try {
    const { lat, lng, description, issueType } = req.body;
    const image = req.file ? '/uploads/' + req.file.filename : '';
    const newReport = new CitizenReport({ 
        location: { lat: parseFloat(lat), lng: parseFloat(lng) }, 
        description, 
        issueType: issueType || 'other',
        image 
    });
    await newReport.save();
    
    // Broadcast real-time
    const io = req.app.get('io');
    if (io) io.emit('newCitizenReport', newReport);
    
    res.status(201).json(newReport);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getReports = async (req, res) => {
  try {
    const reports = await CitizenReport.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const user = await require('../models/User').findById(req.user);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    const report = await CitizenReport.findByIdAndUpdate(id, { status }, { new: true });
    if (!report) return res.status(404).json({ message: 'Report not found' });

    const io = req.app.get('io');
    if (io) io.emit('citizenReportUpdated', report);

    res.json(report);
  } catch (error) { res.status(500).json({ error: error.message }); }
};
