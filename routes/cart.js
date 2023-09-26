require('dotenv').config();
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const ObjectId = require('mongodb').ObjectId;
const auth = require('../middleware/authorization');

const Cart = require('../models/Cart');
const Card = require('../models/Card');
const User = require('../models/User');

router.patch('/', auth, async (req, res) => {
  const { cartItems } = await req.body;
  // console.log(cartItems);
  try {
    if (!cartItems) {
      return console.log('cartItems not defined');
    }
    const cards = await Card.find({});
    let foundCard = {};
    // https://stackoverflow.com/questions/47238581/wait-findoneandupdate-in-a-loop-end?rq=1
    // https://docs.mongodb.com/manual/reference/operator/update/positional/#update-documents-in-an-array
    const runUpdate = (item) => {
      return new Promise((resolve, reject) => {
        cards.forEach((card) => {
          if (card._id.toString() === item._id) {
            foundCard = card;

            Card.updateOne(
              { _id: card._id },
              {
                $set: {
                  quantity: card.quantity - item.quantity_selected
                }
              }
            )
              .then((res) => resolve())
              .catch((err) => reject(err));
          }
        });

        User.updateOne(
          { _id: ObjectId(foundCard.userID), 'cards._id': foundCard._id },
          {
            $set: {
              'cards.$.quantity': foundCard.quantity - item.quantity_selected
            }
          }
        )
          .then((res) => resolve())
          .catch((err) => reject(err));
      });
    };
    let promiseArr = [];
    cartItems.forEach((item) => promiseArr.push(runUpdate(item)));

    Promise.all(promiseArr)
      .then((res) => res.json)
      .catch((err) => err.message);

    res.status(200).json({
      data: {
        cartItems
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
