const { validationResult } = require('express-validator');

module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array()[0].msg;
    return res.status(400).json({
      statusCode: 400,
      message,
      error: 'Bad Request',
    });
  }
  next();
};
