const fs = require('fs');
const fsPromises = require('fs/promises');
const axios = require('axios');
require('dotenv').config();
const express = require('express');
const router = express.Router();
const ObjectId = require('mongodb').ObjectId;
const Card = require('../models/Card');
const { handleFiles } = require('../helpers/handleFiles');

// Get all cards in site catalog i.e. all users cards
router.get('/', async (req, res) => {
  // try {

  //   let cards = await Card.find();

  //   if (!cards) {
  //     return console.log('no results');
  //   }

  //   handleFiles(fs, './data', 'cardcatalog.json', JSON.stringify(cards));
  //   res.status(200).json(cards);
  // } catch (err) {
  //   res.status(500).json({ message: err.message });
  // }
  try {
    const result = await fsPromises.readFile('./data/cardcatalog.json', { encoding: 'utf8' });
    const data = JSON.parse(result);
    console.log('parsing data and sending')
    res.status(200).json(data);
  } catch (error) {
    console.log('error')
    res.status(500).json({ message: error.message });
  }
});

// Get all english card names from Skryfall API
router.get('/cardnames', async (req, res) => {
  try {
    const response = await axios.get('https://api.scryfall.com/catalog/card-names');
    const data = response.data.data;
    handleFiles(fs, './data', 'cardnames.json', JSON.stringify(data));

    res.status(200).json(data);
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
    // console.log(cards);
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

    console.log(card)

    res.status(200).json({ isQuantityAvailable, card });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
