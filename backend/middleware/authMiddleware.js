const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Read token from Authorization header (Bearer TOKEN)
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify JWT using secret from .env
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user id to request
    req.user = decoded.userId; 
    
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

module.exports = authMiddleware;
