const jwt  = require('jsonwebtoken');
const { User } = require('../models');

module.exports = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({
      statusCode: 401,
      message:    'Access token is missing',
      error:      'Unauthorized',
    });
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user    = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({
        statusCode: 401,
        message:    'User not found',
        error:      'Unauthorized',
      });
    }
    req.user = user;
    next();
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      statusCode: 401,
      message:    expired ? 'Access token expired' : 'Invalid access token',
      error:      'Unauthorized',
      code:       expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
    });
  }
};
