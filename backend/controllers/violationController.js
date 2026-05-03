const Violation = require('../models/Violation');
const User = require('../models/User');
const PDFDocument = require('pdfkit');

exports.getViolations = async (req, res) => {
  try {
    const user = await User.findById(req.user);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let query = {};
    if (user.role === 'citizen') {
      query = { assignedTo: req.user };
    }

    const violations = await Violation.find(query).sort({ createdAt: -1 });
    res.json(violations);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.createViolation = async (req, res) => {
  try {
    const user = await User.findById(req.user);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin privilege required' });
    }

    const { vehicleNumber, violationType, fine, image, assignedToEmail } = req.body;
    
    let assignedToId = null;
    if (assignedToEmail) {
      const citizen = await User.findOne({ email: assignedToEmail, role: 'citizen' });
      if (citizen) {
        assignedToId = citizen._id;
      }
    }

    const newViolation = new Violation({ 
      vehicleNumber, 
      violationType, 
      fine, 
      image,
      createdBy: req.user,
      assignedTo: assignedToId
    });
    await newViolation.save();

    const io = req.app.get('io');
    if (io) io.emit('newViolation', newViolation);

    // Generate E-Challan PDF
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=challan_${vehicleNumber}.pdf`);
    doc.pipe(res);
    
    doc.fontSize(22).fillColor('red').text('M.T.D. E-CHALLAN', { align: 'center' }).moveDown();
    doc.fontSize(16).fillColor('black').text(`Vehicle Number: ${vehicleNumber}`);
    doc.text(`Rule Violation: ${violationType}`);
    doc.text(`Fine Amount: Rs. ${fine}`);
    if (assignedToEmail) doc.text(`Assigned To: ${assignedToEmail}`);
    doc.text(`Incident Time: ${new Date().toLocaleString()}`);
    if (image) doc.text(`Linked Image Evidence: ${image}`); // Mock image text link
    
    doc.moveDown(2).fontSize(12).fillColor('red').text('Pay fine online within 15 days to avoid severe legal action.', { align: 'center' });
    doc.end();

  } catch (error) { res.status(500).json({ error: error.message }); }
};
