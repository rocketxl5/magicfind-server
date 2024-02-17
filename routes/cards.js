const fs = require('fs');
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const router = express.Router();
const auth = require('../middleware/authorization');
const Card = require('../models/Card');
const User = require('../models/User');
const ObjectId = require('mongodb').ObjectId;
const { handleFiles } = require('../helpers/handleFiles');
const skryfall = require('../data/ALCHEMY');
const features = require('../data/FEATURES');

// Get feature cards image urls
router.get('/feature', async(req, res) => {
  let result = []
  const promises = features.map(async (feature, index) => {
    const response = await axios.get(`https://api.scryfall.com/cards/search?order=set&q=e%3Asld+${feature.query}&unique=cards`);
    const cards = response.data.data;
    cards.forEach(card => {
      if(card.image_uris) {
        result.push(card.image_uris.normal)
      }
      if(card.card_faces) {
        card.card_faces.forEach(card_face => {
          result.push(card_face.image_uris.normal)
        })
      }
      // else if(card.card_faces) {
      //   card_faces.forEach(card => {
      //     result.push(card.image_uris.normal)
      //   })
      // }
      // else {
      //   result.push(card)
      // }
    })
    // const item = {title: feature.title, urls: urls, art: card}
    // result.push(item)
    return response;
  })

  Promise.all(promises)
    .then(res => {
      handleFiles(fs, './data', 'sld.json', JSON.stringify(result));
      // res.status(200).json(result)
    })
    .catch((error) => { throw new Error(error) })
})


// Get all english card names from Skryfall API
router.get('/cardnames', async (req, res) => {

  let alchemy_cardnames = []
  try {
    const urls = skryfall.alchemy_sets.map(set => {
      return `https://api.scryfall.com/cards/search?include_extras=true&include_variations=true&order=set&q=e%3${set}&unique=prints`
    })

    let cards = []

    const fetchCards = async (url, isFetch, results) => {
      do {
        const response = await axios.get(url);
        const { has_more, next_page, data } = response.data;
        isFetch = has_more;
        url = next_page;
        results.push(...data);
      } while (isFetch)

      return results;
    }

    const promises = urls.map(async (url) => {
      let isFetch = true;
      const results = await fetchCards(url, isFetch, []);
      cards = [...cards, ...results];
    })

    const resolved = Promise.all(promises);

    if (resolved) {

      alchemy_cardnames = cards.map(card => card.name);
    }

  } catch (error) {
    throw new Error(error);
  }

  try {
    const response = await axios.get('https://api.scryfall.com/catalog/card-names');
    const cardnames = response.data.data;

    // Returns array of cardnames excluding cards begining with A- (Arena cards)
    const filteredCardnames = cardnames.filter(cardname => {
      return /^(?!A-).*$/.test(cardname) && !alchemy_cardnames.includes(cardname)
    });

    const searchRedundencies = async (filteredCardnames) => {
      try {
        const result = await filteredCardnames.map((name, index) => { return { name: name, index: index } })
          .filter(obj => { return obj.name.includes('//') })
          .map(obj => { return { name: obj.name.split('//').map(el => el.trim()), index: obj.index } })
          .filter(obj => { return obj.name[0].includes(obj.name[1]) });
        return await result;
      } catch (error) {
        throw new Error(error.message);
      }
    }
    const removeRedundencies = async (redundencies, filteredCardnames) => {
      await redundencies.forEach((redundency, i) => {
        const index = redundency.index - i;
        const spliced = filteredCardnames.splice(index, 1);
      });
    }

    searchRedundencies(filteredCardnames).then((found) => {
      removeRedundencies(found, filteredCardnames).then(() => {
        handleFiles(fs, './data', 'cardnames.json', JSON.stringify(filteredCardnames));
        res.status(200).json(filteredCardnames);
      })
    });
  } catch (error) {
    throw new Error(error);
  }
})

// Get Skryfall API card title from data/cardnames.json
router.get('/mtg-cardnames', async (req, res) => {
  try {
    const result = fs.readFileSync('./data/cardnames.json', { encoding: 'utf8' });
    const cardNames = JSON.parse(result);
    res.status(200).json(cardNames);
  } catch (error) {
    throw new Error('Cannot fetch card title from api cardnames file');
  }
});

// Get Secret Lair Drop card set
router.get('/feature/:query/:iteration', async (req, res) => {
  const { query, iteration } = req.params;

  try {
    const fetchCards = async (props) => {
      let { query, cards, isFetch } = props
      do {
        const response = await axios.get(query);
        const { has_more, next_page, data } = response.data;
        isFetch = has_more;
        query = next_page;
        cards = [...cards, ...data];
      } while (isFetch)

      return cards
    }

    let isFetch = true;
    let cards = []
    const results = []
    cards = await fetchCards({ query, cards, isFetch })

    res.status(200).json({ results: cards })
  } catch (error) {
    throw new Error(error)
  }
})

// Get catalog published card names 
router.get('/catalog', async (req, res) => {

  try {
    const publishedCards = await Card.find(
      { _published: { $ne: [] } }
    )
    // const data = await fsPromises.readFile('./data/cardcatalog.json', { encoding: 'utf8' });

    results = publishedCards.map(card => {
      return card.name
    }).filter((name, index, array) => {
      return array.indexOf(name) === index;
    });

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// /////////////////
// Search Catalog //
// /////////////////
router.get('/catalog/:cardName', async (req, res) => {
  const { cardName, userID } = req.params;
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
        layout: 1,
        name: 1,
        oversized: 1,
        set_name: 1,
        _published: 1,
        _uuid: 1
      });

    if (!results.length) {
      return res.status(400).json({ message: `No result for ${cardName}`, cardName: cardName })
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

// /////////////////
// Search Catalog //
// /////////////////
router.get('/catalog/:cardName/:userID', async (req, res) => {
  const { cardName, userID } = req.params;
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
        layout: 1,
        name: 1,
        oversized: 1,
        set_name: 1,
        _published: 1,
        _uuid: 1
      });

    if (!results.length) {
      return res.status(400).json({ message: `No result for ${cardName}`, cardName: cardName })
    }

    const cards = JSON.parse(JSON.stringify(results));
    const filterCards = cards.filter((card) => !card._published.includes(userID))

    const publishedCards = [];

    filterCards.forEach((card) => {
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
router.get('/:userID/:query', auth, async (req, res) => {
  const { userID, query } = req.params;

  // Custom error handler messages 
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

    let results

    // If query is for card names
    if (query === 'cardnames') {
      // Remove card names duplicates
      results = cards.map(card => {
        return card.name
      }).filter((name, index, array) => {
        return array.indexOf(name) === index;
      })
    }
    else if (query === 'cards') {
      results = cards
    }

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// //////////////////////////////
// Add Card To User Collection //
// Add User To Card Owners //////
// //////////////////////////////
router.post(
  '/add/:userID/:cardID',
  auth,
  async (req, res) => {
    const { userID, cardID } = req.params;
    const selectedCard = req.body;
    // console.log(userID)
    // console.log(cardID)
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
      // Add user id to card specifications array property
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

      // Convert mongoose object to js object
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

// /////////////////////////////
// Edit Card [Edit, Update]  ///
// /////////////////////////////
router.patch('/edit/:cardID/:userID', auth, async (req, res) => {
  const {
    cardName,
    price,
    quantity,
    condition,
    language,
    comment,
    banner,
    published,
  } = await req.body;

  const { cardID, userID } = req.params;



  try {
    const updatedUser = await User.updateOne(
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
          'cards.$._language': language,
          'cards.$._comment': comment,
          'cards.$._is_banner': banner,
          'cards.$._is_published': published,
          'cards.$._date_published': Date.now()
        }
      }
    ); 

    if (!updatedUser) {
      return res.status(400).json({ message: 'Could not update selected card', collection: 'user' });
    }

    const user = await User.findOne({ _id: ObjectId(userID) });

    if (!user) {
      return res.status(400).json({ message: 'Could not retrieve user data' });
    }

    const { name, email, country } = user;

    // If update is publish
    if (published) {

      try {
        // Search for existing document.
        const doc = await Card.findOne({
          _id: ObjectId(cardID),
          '_published.userID': userID
        })
        // If it does not exist
        if (!doc) {
          // Create document
          const publishCard = await Card.updateOne(
          {
            _id: ObjectId(cardID)
          },
          {
            $push: {
              _published: { userID, userName: name, email, country, price, quantity, language, condition, comment }
            }
          })
        }
        else {
          // Else, update existing document
          await Card.updateOne(
            {
              _id: ObjectId(cardID),
              '_published.userID': userID
            },
            {
              $set: {
                '_published.$.userName': name,
                '_published.$.userEmail': email,
                '_published.$.userCountry': country,
                '_published.$.price': price,
                '_published.$.quantity': quantity,
                '_published.$.condition': condition,
                '_published.$.language': language,
                '_published.$.comment': comment,
              }
            }
          )
        }
      } catch (error) {
        return res.status(400).json({ message: 'Something went wrong. Card could not be updated' })
      }
    }
      // Update is unpublish card
    else {
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

// //////////////////////////////////////////////
// Delete Card [User.cards, Card._published]  ///
// //////////////////////////////////////////////
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
        // Remove user from card _owners & card _published
        $pull: {
          _owners: { userID: userID },
          _published: { userID: userID }
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
