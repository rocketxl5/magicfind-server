const fs = require('fs');
const fsPromises = require('fs/promises');
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const router = express.Router();
const auth = require('../middleware/authorization');
const Card = require('../models/Card');
const User = require('../models/User');
const ObjectId = require('mongodb').ObjectId;
const { appendToFile } = require('../helpers/appendToFile');
const { handleFiles } = require('../helpers/handleFiles');
const cardProps = require('../data/cardProps');

// Get all english card names from Skryfall API
router.get('/cardnames', async (req, res) => {
  try {
    const response = await axios.get('https://api.scryfall.com/catalog/card-names');
    const cardnames = response.data.data;

    const filteredCardnames = cardnames.filter(cardname => {
      return /^(?!A-).*$/.test(cardname)
    })

    console.log(filteredCardnames)

    handleFiles(fs, './data', 'cardnames.json', JSON.stringify(filteredCardnames));

    res.status(200).json(filteredCardnames);
  } catch (error) {
    throw new Error(error)
  }
})

// Get Skryfall API card title from data/cardnames.json
router.get('/api-cardnames', async (req, res) => {
  try {
    const result = await fsPromises.readFile('./data/cardnames.json', { encoding: 'utf8' });
    const cardNames = await JSON.parse(result);


    res.status(200).json(cardNames);
  } catch (error) {
    throw new Error('Cannot fetch card title from api cardnames file')
  }
})

// Get Single Card By Name (Search user strore for single card)
router.get('/:cardName/:userID', auth, async (req, res) => {
  console.log(req.params)
  if (req.params.cardName === '') {
    return res.status(400).json({ msg: 'Field is empty' });
  }

  let { cardName, userID } = req.params;

  try {
    let user = await User.findOne({ _id: userID });
    console.log(user)
    if (!user) {
      return res.status(400).send('User does not exist');
    }





    const results = user.cards.unpublished.filter((card) => {
      return card.name.toLowerCase() === cardName.toLowerCase();
    });

    // console.log(results)

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
      return res.status(400).send('No corresponding user found');
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
  '/add/:userID/:cardID',
  auth,
  async (req, res) => {
    const { userID, cardID } = await req.params;
    const selectedCard = await req.body;
    const message = {
      server: {
        type: 'server',
        body: 'A problem occured. Card could not be added.'

      },
      notFound: {
        type: 'not_found',
        body: 'No corresponding user found.'
      },
      cardExist: {
        type: 'card_exist',
        body: 'Card Already In Collection.'
      },
      cardAdded: {
        type: 'card_added',
        body: 'Card Successfuly Added.'
      }
    }

    let newCard = {};

    try {

      newCard = await Card.findOne({ id: cardID });
      if (!newCard) {
        newCard = await new Card(selectedCard);

        if (!newCard) {
          return res
            .status(400)
            .json(message.server);
        } else {

          await newCard.save();
        }
      }
    } catch (error) {
      throw new Error(error)
    }

    try {

      const user = await User.findOne({ _id: ObjectId(userID) });

      if (!user) {
        return res.status(400).send(message.notFound);
      }

      const isFound = async (user, cardID) => {
        try {
          const cards = user.cards.unpublished;
          return await cards.find(card => {
            return card.id === cardID
          });

        } catch (error) {
          throw new Error(error)
        }
      }

      if (await isFound(user, cardID)) {
        console.log('is found')
        return res.status(400).send(message.cardExist);
      }

      const writeFile = async (fs, catalog, card) => {
        try {
          let parsed = JSON.parse(catalog);
          parsed.push(card);
          stringed = JSON.stringify(parsed);
          const res = await fs.writeFileSync('./data/cardcatalog.json', stringed, 'utf8');
          return res;
        } catch (error) {
          console.error(`Error: ${error}`);
        }
      }

      const readFile = async (fs) => {
        try {
          const catalog = await fs.readFileSync('./data/cardcatalog.json', 'utf8');
          return catalog;
        } catch (error) {
          console.error(`Error: ${error}`);
        }
      }

      const catalog = await readFile(fs);

      const added = await writeFile(fs, catalog, newCard)

    } catch (error) {
      throw new Error(error)
    }

    try {
      const copy = newCard.toObject();
      delete copy['_owners'];
      delete copy['_published'];

      Card.updateOne(
        {
          id: newCard.id
        },
        {
          $push: {
            _owners: { userID }
          }
        },
        () => console.log(`${userID} successfully added to owners`))

      // Add newCard from current user cards object

      User.updateOne(
        { _id: ObjectId(userID) },
        {
          $push: {
            'cards.unpublished': { ...copy }
          }
        },
        () => console.log(`${newCard.name} successfully added to store`)
      );

      res.status(200).send(message.cardAdded);

      } catch (error) {
      throw new Error(error)
      }

    // const newProps = [
    //   'asking_price',
    //   'condition',
    //   'comment',
    //   'isPublished',
    //   'datePublished',
    //   'quantity',
    //   'userID',
    //   'userName',
    //   'userCountry',
    // ];
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
