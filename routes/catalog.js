const fs = require('fs');
const axios = require('axios');
require('dotenv').config();
const express = require('express');
const router = express.Router();
const ObjectId = require('mongodb').ObjectId;
const Card = require('../models/Card');
const { handleFiles, readFile } = require('../helpers/handleFiles');

router.get('/', async (req, res) => {
  try {
    // let cards = await Card.findOne({ name: cardName });

    let cards = await Card.find();

    if (!cards) {
      return console.log('no results');
    }
    // const results = cards.filter((card) => {
    //   return card.name.toLowerCase() === cardName.toLowerCase();
    // });
    res.status(200).json({ data: cards });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all english card names from Skryfall API
router.get('/cardnames', async (req, res) => {
  try {
    const response = await axios.get('https://api.scryfall.com/catalog/card-names');
    handleFiles(fs, './data', 'cardnames.json', JSON.stringify(response.data.data));
    fs.readFile('./data/cardnames.json', 'utf8', (error, data) => {
      if (error) {
        throw new Error(error)
      }
      res.status(200).json(JSON.parse(data));
    });

  } catch (error) {
    throw new Error(error)
  }
})


router.get('/:cardName', async (req, res) => {
  if (!req.params.cardName) {
    return res.status(400).json({ msg: 'Field is empty' });
  }

  let { cardName } = req.params;

  console.log('cardName', cardName);

  try {
    // let cards = await Card.findOne({ name: cardName });

    let cards = await Card.find();
    // console.log(cards);
    const results = cards.filter((card) => {
      return card.name.toLowerCase() === cardName.toLowerCase();
    });
    console.log('default 2');
    res.status(200).json({ data: results, message: '/cardname' });
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

    res.status(200).json({ data: { isQuantityAvailable, card } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
