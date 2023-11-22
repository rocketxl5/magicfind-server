const fs = require('fs');
const fsPromises = require('fs/promises');
const axios = require('axios');
require('dotenv').config();
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const ObjectId = require('mongodb').ObjectId;
const Card = require('../models/Card');
const { handleFiles } = require('../helpers/handleFiles');

// Get cards from data/cardcatalog.json file
// Query sent from Autocomplete module @SearchCatalog @SearchCollection 
router.get('/', async (req, res) => {
  try {
    const result = await fsPromises.readFile('./data/cardcatalog.json', { encoding: 'utf8' });
    const data = JSON.parse(result);

    res.status(200).json(data);
  } catch (error) {
    console.log('error')
    res.status(500).json({ message: error.message });
  }
});

// SearchCatalog request
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
    const verified = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
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

router.get('/:cardName/:cardID/:quantity', async (req, res) => {
  let { cardName, cardID, quantity } = req.params;
  console.log('quantity', quantity);
  let isQuantityAvailable = true;
  try {
    let card = await Card.findOne({
      _id: cardID
    });

    console.log(card.quantity);
    if (quantity > card.quantity) {
      isQuantityAvailable = false;
    }

    console.log(card)

    res.status(200).json({ isQuantityAvailable, card });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
