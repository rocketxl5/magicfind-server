const fs = require('fs');
const fsPromises = require('fs/promises');
require('dotenv').config();
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const ObjectId = require('mongodb').ObjectId;
const auth = require('../middleware/authorization');
const { appendToFile } = require('../helpers/appendToFile');
const Card = require('../models/Card');
const User = require('../models/User');

// Get Skryfall API card title from data/cardnames.json
router.get('/api-card-titles', async (req, res) => {
  try {
    const result = await fsPromises.readFile('./data/cardnames.json', { encoding: 'utf8' });
    const cardTitles = await JSON.parse(result);

    res.status(200).json(cardTitles);
  } catch (error) {
    throw new Error('Cannot fetch card title from api cardnames file')
  }
})

// Get Single Card By Name (Search user strore for single card)
router.get('/:cardName/:userID', auth, async (req, res) => {
  if (req.params.cardName === '') {
    return res.status(400).json({ msg: 'Field is empty' });
  }

  let { cardName, userID } = req.params;

  try {
    let user = await User.findOne({ _id: userID });

    if (!user) {
      return res.status(400).send('User does not exist');
    }

    const results = user.cards.filter((card) => {
      return card.name.toLowerCase() === cardName.toLowerCase();
    });

    if (!results) {
      return res.status(400).json({ msg: 'Could not find card in store' });
    }

    res.status(200).json({ results, cardName });
    // let card = Card.find({ name: name });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Single Card By ID
router.get('/modify/:cardID/:userID', auth, async (req, res) => {
  const { cardID, userID } = await req.params;

  // console.log('card id', cardID);
  // console.log('user id', userID);

  try {
    let user = await User.findOne({ _id: userID });

    if (!user) {
      return res.status(400).send('User does not exist');
    }
    // console.log(user);

    const result = user.cards.filter((card) => {
      return card.cardID === cardID;
    });
    res.send('In modification');
    // res.status(200).json({ data: result });
    // let card = Card.find({ name: name });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get All Cards By User ID
router.get('/:userID', auth, async (req, res) => {
  const { userID } = req.params;

  try {
    let user = await User.findOne({ _id: userID });

    if (!user) {
      return res.status(400).json({ msg: 'User not found' });
    }

    const cards = user.cards;

    res.status(200).json(cards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// //////////////////////////
// Add Card To User Store ///
// Add User To Card Owners //
// //////////////////////////
router.post(
  '/',
  auth,
  body('condition').not().isEmpty(),
  body('price').not().isEmpty(),
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Destructure request body
    let {
      id,
      artist,
      color,
      finish,
      frame,
      image_uris,
      name,
      rarity,
      released,
      set_name,
      type_line,
      condition,
      language,
      quantity,
      price,
      comment,
      isPublished,
      datePublished,
      userID,
      userName,
      userCountry,
    } = await req.body;

    try {
      // Create a new card
      let card = await new Card({
        id,
        artist,
        color,
        finish,
        frame,
        image_uris,
        name,
        rarity,
        released,
        set_name,
        type_line,
        condition,
        language,
        quantity,
        price,
        comment,
        isPublished,
        datePublished,
        userID,
        userName,
        userCountry,
      });

      if (!card) {
        console.log('cant create new card')
        return res
          .status(400)
          .json({ msg: 'There was a problem. Card not added to collection' });
      }
      console.log(card);
      // userID = ObjectId(userID);
      console.log(userID)
      // Add a card from current user cards object
      User.updateOne(
        { _id: userID },
        {
          $push: {
            cards: {
              id: card.id,
              artist: card.artist,
              color: color,
              finish: finish,
              frame: frame,
              image_uris: image_uris,
              name: name,
              rarity: rarity,
              released: released,
              set_name: set_name,
              type_line: type_line,
              condition: condition,
              language: language,
              quantity: card.quantity,
              price: card.price,
              comment: card.comment,
              isPublished: card.isPublished,
              datePublished: card.datePublished,
              userID: userID,
              userName: userName,
              userCountry: userCountry,
            }
          }
        },
        () => console.log(`${name} successfully added to store`)
      );

      appendToFile(fs, './data/cardcatalog.json', card, 'utf8');

      await card.save();

      res.send({ message: 'Card successully added to your store', data: req.body });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Modify card data from user store
router.patch('/modify', auth, async (req, res) => {
  const { cardID, condition, language, quantity, price, comment, isPublished, datePublished, userID } =
    await req.body;
  // console.log(req.body);
  try {
    const updatedCard = await User.updateOne(
      {
        _id: ObjectId(userID),
        'cards._id': ObjectId(cardID)
      },
      {
        $set: {
          'cards.$.condition': condition,
          'cards.$.language': language,
          'cards.$.quantity': quantity,
          'cards.$.price': price,
          'cards.$.comment': comment,
          'cards.$.isPublished': isPublished,
          'cards.$.datePublished': datePublished
        }
      }
    );

    if (!updatedCard) {
      return res
        .status(400)
        .json({ errors: [{ msg: 'User does not exists' }] });
    }

    const updatedOwner = await Card.updateOne(
      {
        _id: ObjectId(cardID)
      },
      {
        $set: {
          condition,
          language,
          quantity,
          price,
          comment,
          isPublished
        }
      }
    );

    if (!updatedOwner) {
      return res
        .status(400)
        .json({ errors: [{ msg: 'Card does not exists' }] });
    }

    res.status(200).json({ data: [updatedCard, updatedOwner] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Remove a given card from cards object of current user
router.delete('/', auth, async (req, res) => {
  const { cardID, userID } = await req.body;
  // console.log('cardID', cardID);
  // console.log('userID', userID);

  try {
    const user = await User.findOneAndUpdate(
      { _id: ObjectId(userID) },
      {
        // Remove card from user profile cards object
        $pull: { cards: { _id: ObjectId(cardID) } }
      }
    );

    deleteFromFile(fs, './data', 'cardcatalog.json', { cardID, userID }, 'utf8');

    const card = await Card.findOneAndDelete({ _id: cardID });

    res.status(200).json({
      msg: 'Card successfully deleted',
      card: card,
      user: user
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
