const fs = require('fs');
const fsPromises = require('fs/promises');
const axios = require('axios');
require('dotenv').config();
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const ObjectId = require('mongodb').ObjectId;
const Card = require('../models/Card');
const User = require('../models/User');
const { handleFiles } = require('../helpers/handleFiles');

// Catalog request
// Get all cards in Magic Find catalog where catalog card name === cardName
router.get('/:cardName', async (req, res) => {
  if (!req.params.cardName) {
    return res.status(400).json({ msg: 'Field is empty' });
  }

  let verifiedUserID = '';
  let cards = {};
  const { cardName } = req.params;
  const token = req.headers.authorization;

  if (token) {
    const verified = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    verifiedUserID = verified.user.id
  }

  try {
    // let cards = await Card.findOne({ name: cardName });
    if (!token) {
      cards = await Card.find();
    } else {
      cards = await Card.find({ userID: { $ne: verifiedUserID } });
    }

    const results = cards.filter((card) => {
      return card.name.toLowerCase() === cardName.toLowerCase();
    });

    res.status(200).json({ results, cardName });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:userID/:cardID/:quantity', async (req, res) => {
  let { userID, cardID, quantity } = req.params;
  console.log(userID)
  console.log(cardID)
  try {
    let user = await User.findOne({
      _id: userID
    });

    const card = user.cards.find(card => {
      return card._id.equals(ObjectId(cardID));
    })

    if (card) {
      // Check if quantity selected is available
      const isAvailable = (card._quantity - parseInt(quantity) >= 0) ? true : false;
      res.status(200).json({ isAvailable: isAvailable });
    }

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
