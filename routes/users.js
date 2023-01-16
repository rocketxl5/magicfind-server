require('dotenv').config();
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult, sanitize } = require('express-validator');
const auth = require('../middleware/authorization');
const User = require('../models/User');
// const urlencode = require('../middleware/urlencode');
// const auth = require('../middleware/authorization');

// Getting All Users
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    // console.log(users);
    res.json(users);
  } catch (err) {
    //   server error
    res.status(500).json({ message: err.message });
  }
});

// Get One User
router.get('/:id', async (req, res) => {});

////////////////
////////////////
// User Login //
////////////////
////////////////
router.post(
  '/login',
  body('email').not().isEmpty(),
  body('password').isLength({ min: 4 }),
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = await req.body;

    try {
      let user = await User.findOne({ email });

      if (!user) {
        // console.log('no match');
        return res.status(400).json({ errors: [{ msg: 'No user found' }] });
      }

      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        return res.status(400).json({ errors: [{ msg: 'Wrong password' }] });
      }

      // Create Token
      const payload = {
        user: {
          id: user.id
        }
      };

      jwt.sign(
        payload,
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: 36000 },
        (err, token) => {
          if (err) {
            throw err;
          } else {
            res.status(201).json({ token, data: user });
          }
        }
      );
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

///////////////////
///////////////////
// Register User //
///////////////////
///////////////////
router.post(
  '/',
  body('name').not().isEmpty(),
  body('email').isEmail(),
  body('country').not().isEmpty(),
  body('password').isLength({
    min: 4
  }),
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let { name, email, country, password } = await req.body;

    // Returns capital letter string
    const sanitize = (string) => {
      return string.toLowerCase().charAt(0).toUpperCase() + string.substring(1);
    };

    name = sanitize(name);
    country = sanitize(country);
    try {
      // Check if name is available
      let userName = await User.findOne({ name });

      if (userName) {
        return res.status(400).json({
          errors: [{ message: 'Name is already taken' }, { field: 'name' }]
        });
      }
      let userEmail = await User.findOne({ email });

      // Check if email exists
      if (userEmail) {
        return res.status(400).json({
          errors: [{ message: 'Email already exits', field: 'email' }]
        });
      }

      user = new User({
        name,
        email,
        country,
        password
      });

      // Hash Password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      await user.save();
      // 201 = successfully created object
      res.status(201).json({ status: 201, data: user });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Updating one
router.patch('/:id', async (req, res) => {});
// Deleting one
router.delete('/:id', async (req, res) => {});

module.exports = router;
