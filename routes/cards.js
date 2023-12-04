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

    // Returns array of cardnames minus cards beginning with A- (Arena cards)
    const filteredCardnames = cardnames.filter(cardname => {
      return /^(?!A-).*$/.test(cardname)
    });

    const repetitions = data.map((name, index) => { return { name: name, index: index } })
      .filter(obj => { return obj.name.includes('//') })
      .map(obj => { return { name: obj.name.split('//').map(el => el.trim()), index: obj.index } })
      .filter(obj => { return obj.name[0].includes(obj.name[1]) });
    repetitions.forEach(repetition => data.splice(repetition.index, 1));

    handleFiles(fs, './data', 'cardnames.json', JSON.stringify(filteredCardnames));

    res.status(200).json(filteredCardnames);
  } catch (error) {
    throw new Error(error)
  }
})

// Get Skryfall API card title from data/cardnames.json
router.get('/api-cardnames', async (req, res) => {
  try {
    const result = fs.readFileSync('./data/cardnames.json', { encoding: 'utf8' });
    const cardNames = JSON.parse(result);

    // Remove repeated card names with //
    // ex: Ulamog, the ceaseless hunger // Ulamog, the ceaseless hunger
    const searchRedundencies = async (cardNames) => {
      try {
        const result = await cardNames.map((name, index) => { return { name: name, index: index } })
          .filter(obj => { return obj.name.includes('//') })
          .map(obj => { return { name: obj.name.split('//').map(el => el.trim()), index: obj.index } })
          .filter(obj => { return obj.name[0].includes(obj.name[1]) });
        return await result;
      } catch (error) {
        throw new Error(error.message)
      }
    }
    const removeRedundencies = async (redundencies, cardNames) => {
      await redundencies.forEach((redundency, i) => {
        const index = redundency.index - i;
        const spliced = cardNames.splice(index, 1);
      });
    }

    searchRedundencies(cardNames).then((found) => {
      removeRedundencies(found, cardNames).then(() => {
        res.status(200).json(cardNames);
      })
    });

  } catch (error) {
    throw new Error('Cannot fetch card title from api cardnames file')
  }
});


// Get cards from data/cardcatalog.json file
router.get('/catalog/:userID', async (req, res) => {
  const userID = req.params;
  const message = {
    noCards: {
      title: 'no_cards',
      body: 'Site catalog is currently empty.'
    }
  };
  let cards = [];
  let cardNames = [];

  try {

    const data = await fsPromises.readFile('./data/cardcatalog.json', { encoding: 'utf8' });
    cards = JSON.parse(data);

    const count = cards.length;

    if (!count) {
      return res.status(400).json(message.noCards)
    }

    const user = await User.findOne({ _id: userID });

    if (!user) {
      const copy = [...cards];
      // cards = copy.filter(card => card.user)
    }

    cardNames = cards.map(card => {
      return card.name
    }).filter((name, index, array) => {
      return array.indexOf(name) === index;
    });

    res.status(200).json({
      cards: cards,
      names: cardNames
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Single Card By Name (Search user strore for single card)
router.get('/:cardName/:userID', auth, async (req, res) => {

  let { cardName, userID } = req.params;

  if (req.params.cardName === '') {
    return res.status(400).json({ msg: 'Field is empty' });
  }

  try {
    let user = await User.findOne({ _id: userID });
    // console.log(user)
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

  const message = {
    server: {
      title: 'server',
      body: 'Card could Not Be Added'

    },
    notFound: {
      title: 'not_found',
      body: 'No User Found'
    },
    noCards: {
      title: 'no_cards',
      body: ['Your collection is currently empty.', 'Go to the Add Card page to start adding cards to your collection.']
    }
  };

  try {
    let user = await User.findOne({ _id: userID });

    if (!user) {
      return res.status(400).json({ msg: 'User not found' });
    }

    const cards = user.cards;

    const count = cards.length;

    if (!count) {
      return res.status(400).json(message.noCards)
    }

    const cardNames = cards.map(card => {
      return card.name
    }).filter((name, index, array) => {
      return array.indexOf(name) === index;
    })

    res.status(200).json({
      cards: cards,
      names: cardNames
    });
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
        title: 'server',
        body: 'Card could Not Be Added'
      },
      notFound: {
        title: 'not_found',
        body: 'No User Found'
      },
      cardExist: {
        title: 'card_exist',
        body: 'Card Already In Collection'
      },
      cardAdded: {
        title: 'card_added',
        body: 'Card Successfuly Added'
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
            .json({ message: message.server });
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
        return res.status(400).json(message.notFound);
      }

      const isFound = async (user, cardID) => {
        try {
          const cards = user.cards;
          return await cards.find(card => {
            return card.id === cardID
          });

        } catch (error) {
          throw new Error(error)
        }
      }

      if (await isFound(user, cardID)) {
        return res.status(400).json(message.cardExist);
      }


      const stat = fs.statSync('./data/cardcatalog.json')
      if (!stat.size) {
        const card = []
        card.push(JSON.stringify(newCard))
        fs.writeFileSync('./data/cardcatalog.json', JSON.stringify(card), 'utf8')
      } else {
        const result = fs.readFileSync('./data/cardcatalog.json', { encoding: 'utf8' });
        const cards = JSON.parse(result)
        cards.push(newCard)
        fs.writeFileSync('./data/cardcatalog.json', JSON.stringify(cards), 'utf8')
      }

    } catch (error) {
      throw new Error(error)
    }

    try {

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


      let cardClone2 = newCard.toObject();
      cardClone2 = { ...cardClone2, _is_published: false }
      delete cardClone2['_owners'];
      delete cardClone2['_published'];

      // Add newCard from current user cards object
      User.updateOne(
        { _id: ObjectId(userID) },
        {
          $push: {
            cards: { ...cardClone2 }
          }
        },
        () => console.log(`${newCard.name} successfully added to store`)
      );

      res.status(200).json({ message: message.cardAdded });

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

  try {
    let user = await User.findOneAndUpdate(
      { _id: ObjectId(userID) },
      {
        // Remove card from user profile cards object
        $pull: {
          cards: { _id: ObjectId(cardID) }
        }
      }
    );

    if (!user) {
      return res.status(400).json({ message: 'Card could not be deleted from users collection', isDeleted: false });
    }

    // deleteFromFile(fs, './data', 'cardcatalog.json', { cardID, userID }, 'utf8');

    const card = await Card.findOneAndDelete({ _id: ObjectId(cardID) });

    if (!card) {
      return res.status(400).json({ message: 'Card could not be deleted from cards', isDeleted: false });
    }

    user = await User.findOne({ _id: ObjectId(userID) });

    if (!user) {
      return res.status(400).json({ message: 'Could not retrieve user data', isDeleted: false });
    }

    res.status(200).json({
      message: 'Card successfully deleted',
      isDeleted: true,
      cards: user.cards
    });
  } catch (error) {
    res.status(500).json(error.message);
  }
});

module.exports = router;
