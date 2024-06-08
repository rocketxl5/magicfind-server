// const fs = require('fs');
// const fsPromises = require('fs/promises');
// const axios = require('axios');
// require('dotenv').config();
const auth = require('../middleware/authorization');
const express = require('express');
const router = express.Router();
// const jwt = require('jsonwebtoken');
const ObjectId = require('mongodb').ObjectId;
const Card = require('../models/Card');
const User = require('../models/User');
// const { handleFiles } = require('../helpers/handleFiles');

router.get('/product/id/:cardId', async (req, res) => {
  const { cardId } = req.params;
  try {

    const card = await Card.find({ id: cardId });
    // if card does not exist
    if (!card.id) {
      // trim card object
      res.status(200).json({ isSet: false, origin: 'catalog' })
    }
    else {
      res.status(200).json({ isSet: true, origin: 'catalog' })
    }
  }
  catch (error) {
    res.status(400).json(error.message)
  }
})

// Get all cards in Magic Find catalog where catalog card name === cardName
router.get('/product/name/:cardName', auth, async (req, res) => {
  const { cardName } = req.params;
  // const page = req.query.page || 0;
  // const cardsPerPage = 10;

  // const card_name = cardName.replace(/[^\w\+]+/g, '-').toLowerCase();
  try {
    const results = await Card.find(
      {
        card_name: cardName,
        catalog: { $ne: [] }
      },
      {
        card_faces: 1,
        finishes: 1,
        image_uris: 1,
        layout: 1,
        name: 1,
        oversized: 1,
        oracle_text: 1,
        released_at: 1,
        set: 1,
        set_name: 1,
        set_uri: 1,
        type_line: 1,
        isPublished: 1,
        card_name: 1,
      });

    if (!results.length) {
      return res.status(400).json({ message: `No result for ${cardName}`, cardName: cardName })
    }

    const cards = JSON.parse(JSON.stringify(results));
    const publishedCards = [];

    cards.forEach((card) => {
      card.catalog.forEach((instance) => {
        const { catalog, ...rest } = card;
        publishedCards.push(Object.assign(rest, instance));
      })
    });
    res.status(200).json(publishedCards)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
});

// Get catalog published card names 
router.get('/product-names', async (req, res) => {

  try {
    const names = await Card.find({ catalog: { $ne: [] } })
      .select('card.name');
    // const data = await fsPromises.readFile('./data/cardcatalog.json', { encoding: 'utf8' });

    if (names.length) {
      names = catalogCards.map(card => {
        return card.name
      }).filter((name, index, array) => {
        return array.indexOf(name) === index;
      });
    }

    // console.log(names)
    // console.log(result.length)

    res.status(200).json(names);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:userID/:cardID/:quantity', auth, async (req, res) => {
  let { userID, cardID, quantity } = req.params;

  try {
    let user = await User.findOne({
      _id: userID
    });

    const card = user.cards.find(card => {
      return card._id.equals(ObjectId(cardID));
    })

    // console.log(card)

    if (card) {
      // Check if quantity selected is available
      const isAvailable = (card._quantity - parseInt(quantity) >= 0) ? true : false;
      res.status(200).json({ isAvailable: isAvailable, quantity: card._quantity });
    } else {
      res.status(200).json({ isAvailable: false, quantity: 0 });
    }

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
