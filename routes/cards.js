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

    // Returns array of cardnames except cards beginning with A- (Arena cards)
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

// Get catalog published card names 
router.get('/catalog', async (req, res) => {

  try {
    const publishedCards = await Card.find(
      { _published: { $ne: [] } }
    )
    // const data = await fsPromises.readFile('./data/cardcatalog.json', { encoding: 'utf8' });

    cardNames = publishedCards.map(card => {
      return card.name
    }).filter((name, index, array) => {
      return array.indexOf(name) === index;
    });

    res.status(200).json({
      cards: cardNames
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// /////////////////////
// Search Catalog //////
// /////////////////////
router.get('/catalog/:cardName', async (req, res) => {
  const { cardName } = req.params;
  const page = req.query.page || 0;
  const cardsPerPage = 10;

  try {
    const results = await Card.find(
      {
        name: cardName,
        _published: { $ne: [] }
      },
      {
        card_faces: 1,
        finishes: 1,
        image_uris: 1,
        name: 1,
        oversized: 1,
        set_name: 1,
        _published: 1
      });

    if (!results.length) {
      return res.status(400).json({ message: `No resul tfor ${cardName}`, cardName: cardName })
    }

    const cards = JSON.parse(JSON.stringify(results));

    const publishedCards = [];

    cards.forEach((card) => {
      card._published.forEach((data) => {
        const { _published, ...rest } = card;
        publishedCards.push(Object.assign(rest, data));
      })
    });

    res.status(200).json({
      cards: publishedCards,
      cardName: cardName
    })
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
})

// ///////////////////////////////////
// Search Collection by Card Name ////
// ///////////////////////////////////
router.get('/collection/:userID/:cardName', auth, async (req, res) => {

  const { userID, cardName } = req.params;

  if (cardName === '') {
    return res.status(400).json({ msg: 'Field is empty' });
  }

  try {
    let user = await User.findOne({ _id: ObjectId(userID) });

    if (!user) {
      return res.status(400).send('User does not exist');
    }

    // Search for a card with cardName
    const found = user.cards.find(card => card.name === cardName);

    if (!found) {
      return res.status(400).json({ message: `No result for ${cardName}`, cardName: cardName })
    }

    const cards = user.cards.filter((card) => {
      return card.name.toLowerCase() === cardName.toLowerCase();
    });

    res.status(200).json({ cards, cardName });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ///////////////////////////////////
// Search Collection by User ID //////
// ///////////////////////////////////
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
    const user = await User.findOne({ _id: ObjectId(userID) });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const cards = user.cards;

    if (cards.length === 0) {
      return res.status(400).json({ message: message.noCards })
    }

    // Filter singled card names
    const cardNames = cards.map(card => {
      return card.name
    }).filter((name, index, array) => {
      return array.indexOf(name) === index;
    })

    res.status(200).json({
      cards: cards,
      names: cardNames,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    const { userID, cardID } = req.params;
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

    let newCard

    try {

      newCard = await Card.findOne({ id: cardID });

      if (!newCard) {

        newCard = new Card(selectedCard);

        if (!newCard) {
          return res
            .status(400)
            .json({ message: message.server });
        } else {

          await newCard.save();
          console.log(newCard._id)
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

      // Validation function
      const isFound = async (user, cardID) => {
        try {
          const cards = user.cards;
          // Look if card already exists in user's cards
          return await cards.find(card => {
            return card.id === cardID
          });

        } catch (error) {
          throw new Error(error)
        }
      }

      // If card already exists, skip and return
      if (await isFound(user, cardID)) {
        return res.status(400).json(message.cardExist);
      }

    } catch (error) {
      throw new Error(error)
    }

    try {
      // Add user id to card owner array property
      Card.updateOne(
        {
          _id: ObjectId(newCard._id)
        },
        {
          $push: {
            _owners: { userID: userID }
          }
        },
        () => console.log(`${userID} successfully added to owners`))

      // Convert mongoose to js object
      // Remove owners & published properties
      const { _owners, _published, ...rest } = newCard.toObject();

      // Add modified card object to user cards property array
      User.updateOne(
        { _id: ObjectId(userID) },
        {
          $push: {
            cards: { ...rest }
          }
        },
        () => console.log(`${newCard.name} successfully added to store`)
      );

      res.status(200).json({ message: message.cardAdded });
      } catch (error) {
      throw new Error(error)
    }
  }
);

// Modify card data from user store
router.patch('/edit/:cardID/:userID', auth, async (req, res) => {
  const {
    cardName,
    price,
    quantity,
    condition,
    comment,
    published
  } = await req.body;

  const { cardID, userID } = req.params;

  let updatedCard

  try {
    updatedCard = await User.updateOne(
      {
        _id: ObjectId(userID),
        'cards._id': ObjectId(cardID)
      },
      {
        $set: {
          'cards.$.cardID': cardID,
          'cards.$.cardName': cardName,
          'cards.$._price': price,
          'cards.$._quantity': quantity,
          'cards.$._condition': condition,
          'cards.$._comment': comment,
          'cards.$._is_published': published,
          'cards.$._date_published': Date.now()
        }
      }
    ); 

    const user = await User.findOne({ _id: ObjectId(userID) });

    if (!user) {
      return res.status(400).json({ message: 'Could not retrieve user data' });
    }

    const { name, email } = user;

    if (published) {
      // Add user id to _publisde
      try {
        await Card.updateOne(
          {
            _id: ObjectId(cardID)
          },
          {
            $push: {
              _published: { userName: name, email, price, quantity, condition, comment }
            }
          })
      } catch (error) {
        return res.status(400).json({ message: error.message })
      }
    }
    else {
      console.log('in unpublished')
      try {
        await Card.updateOne(
          {
            _id: ObjectId(cardID)
          },
          {
            $pull: {
              _published: { userID: userID }
            }
          })
        // () => console.log('Card successfuly removed from published cards'))
      } catch (error) {
        return res.status(400).json({ message: error.message })
      }
    }

    res.status(200).json({
      cards: user.cards,
      isUpdated: true,
      message: 'Card Successfuly Updated'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Remove a given card from cards object of current user
router.delete('/delete', auth, async (req, res) => {
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

    const card = await Card.findOneAndUpdate(
      { _id: ObjectId(cardID) },
      {
        // Remove user form card _owners
        $pull: {
          _owners: { id: userID }
        }
      }
    );

    if (!card) {
      return res.status(400).json({ message: 'Card could not be deleted from cards', isDeleted: false });
    }

    user = await User.findOne({ _id: ObjectId(userID) });

    if (!user) {
      return res.status(400).json({ message: 'Could not retrieve user data', isDeleted: false });
    }

    res.status(200).json({
      cards: user.cards,
      isDeleted: true,
      message: 'Card successfully deleted',
    });
  } catch (error) {
    res.status(500).json(error.message);
  }
});

module.exports = router;
