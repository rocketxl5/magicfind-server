require('dotenv').config();
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const ObjectId = require('mongodb').ObjectId;
const auth = require('../middleware/authorization');

const Card = require('../models/Card');
const User = require('../models/User');

// Get Single Card By Name (Search user strore for single card)
router.get('/:cardName/:userID', auth, async (req, res) => {
  if (req.params.cardName === '') {
    return res.status(400).json({ msg: 'Field is empty' });
  }

  let { cardName, userID } = req.params;

  // console.log('cardName', cardName);

  try {
    let user = await User.findOne({ _id: userID });

    if (!user) {
      return res.status(400).send('User does not exist');
    }

    const result = user.cards.filter((card) => {
      return card.name.toLowerCase() === cardName.toLowerCase();
    });

    if (!result) {
      return res.status(400).json({ msg: 'Could not find card in store' });
    }

    res.status(200).json({ data: result });
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
    // console.log(user);
    res.status(200).json({ data: user.cards });
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
    const {
      skryfallID,
      name,
      type_line,
      set_name,
      rarity,
      image_uris,
      artist,
      frame,
      condition,
      language,
      foil,
      quantity,
      price,
      comment,
      userName,
      userCountry,
      userID
    } = await req.body;

    try {
      // Create a new card
      let card = await new Card({
        skryfallID,
        name,
        type_line,
        set_name,
        rarity,
        image_uris,
        artist,
        frame,
        condition,
        language,
        foil,
        quantity,
        price,
        comment,
        userName,
        userCountry,
        userID
      });

      if (!card) {
        return res
          .status(400)
          .json({ msg: 'There was a problem. Card not added to collection' });
      }

      // Add a card from current user cards object
      User.updateOne(
        { _id: userID },
        {
          $push: {
            cards: {
              _id: card._id,
              skryfallID: card.skryfallID,
              name: card.name,
              type_line: card.type_line,
              set_name: card.set_name,
              rarity: card.rarity,
              image_uris: card.image_uris,
              artist: card.artist,
              frame: card.frame,
              condition: card.condition,
              language: card.language,
              negotiable: card.negotiable,
              foil: card.foil,
              quantity: card.quantity,
              price: card.price,
              comment: card.comment,
              userName: userName,
              userCountry: userCountry,
              user_id: userID
            }
          }
        },
        () => console.log(`${name} successfully added to store`)
      );

      await card.save();

      res.send({ msg: 'In the target', data: req.body });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Modify card data from user store
router.patch('/modify', auth, async (req, res) => {
  const { cardID, condition, language, quantity, price, comment, userID } =
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
          'cards.$.comment': comment
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
          condition: condition,
          language: language,
          quantity: quantity,
          price: price,
          comment: comment
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
