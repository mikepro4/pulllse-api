module.exports = (req, res, next) => {
  const jwt = require('jsonwebtoken');

  const SECRET_KEY = 'MY_SECRET_KEY';  // Make sure to keep your secret key safe and confidential.

  const authHeader = req.headers.authorization;

  // Check if the Authorization header exists
  if (!authHeader) {
    return res.status(401).send({ error: 'Authorization header is missing' });
  }

  // Extract the token from the header
  const token = authHeader.split(' ')[1];

  // Verify the token
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: 'Token verification failed' });
    }

    // Attach the decoded payload to the request object
    req.user = decoded;

    // Proceed to the next middleware or route handler
    next();
  });
};