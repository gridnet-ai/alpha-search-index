const { getAuth } = require('firebase-admin/auth');

/**
 * Middleware to verify Firebase ID token and attach user to request
 * Returns 401 if token is missing or invalid
 */
async function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }
  
  try {
    const token = header.split('Bearer ')[1];
    req.user = await getAuth().verifyIdToken(token);
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Middleware to optionally attach user if token is present
 * Does not block request if token is missing or invalid
 */
async function attachUser(req, res, next) {
  const header = req.headers.authorization;
  
  if (header?.startsWith('Bearer ')) {
    try {
      const token = header.split('Bearer ')[1];
      req.user = await getAuth().verifyIdToken(token);
    } catch (error) {
      // Silent fail - user remains undefined
      console.log('Optional auth failed:', error.message);
    }
  }
  
  next();
}

module.exports = { verifyToken, attachUser };
