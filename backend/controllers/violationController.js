const Violation = require('../models/Violation');
const PDFDocument = require('pdfkit');

exports.getViolations = async (req, res) => {
  try {
    const violations = await Violation.find().sort({ createdAt: -1 });
    res.json(violations);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.createViolation = async (req, res) => {
  try {
    const { vehicleNumber, violationType, fine, image } = req.body;
    
    const newViolation = new Violation({ vehicleNumber, violationType, fine, image });
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
    doc.text(`Incident Time: ${new Date().toLocaleString()}`);
    if (image) doc.text(`Linked Image Evidence: ${image}`); // Mock image text link
    
    doc.moveDown(2).fontSize(12).fillColor('red').text('Pay fine online within 15 days to avoid severe legal action.', { align: 'center' });
    doc.end();

  } catch (error) { res.status(500).json({ error: error.message }); }
};
