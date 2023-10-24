require('dotenv').config();
const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
  // Get token from header
  const token = await req.header('auth-token');
  // console.log(token)
  //  If no token
  if (!token) {
    // 401 unauthorized
    return res.status(401).json({ msg: 'Missing token, authorization denied' });
  }

  // jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
  //   if (err)
  //     return res
  //       .status(403)
  //       .json({ error: err, msg: 'Token no longer valid, access denied' });
  //   req.user = user;
  //   console.log(user)
  //   next();
  // });

  //   Alt
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    console.error(err.message);
    res.status(403).json({ message: err.message });
    // throw new Error(err.message)
  }
};
