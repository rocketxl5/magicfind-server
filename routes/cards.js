const fs = require('fs');
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const router = express.Router();
const auth = require('../middleware/authorization');
const Card = require('../models/Card');
const User = require('../models/User');
const ObjectId = require('mongodb').ObjectId;
const crypto = require('crypto');
const { handleFiles } = require('../helpers/handleFiles');
const skryfall = require('../data/ALCHEMY');
const features = require('../data/FEATURES');
const { CLIENT_RENEG_LIMIT } = require('tls');

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
        // console.log(result)
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

// Get catalog cards by card name
router.get('/catalog/:cardName', async (req, res) => {
  const { cardName, userID } = req.params;
  // const page = req.query.page || 0;
  // const cardsPerPage = 10;
  console.log(cardName)
  // const card_name = cardName.replace(/[^\w\+]+/g, '-').toLowerCase();
  try {
    const results = await Card.find(
      {
        _card_name: cardName,
        _published: { $ne: [] }
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
        _published: 1,
        _card_name: 1,
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
    console.log(publishedCards[0].name)
    res.status(200).json({
      cards: publishedCards,
      query: publishedCards[0].name,
      search: 'catalog'
    })
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
});

// /////////////////
// Search Catalog //
// /////////////////
router.get('/catalog/:cardName/:userID', async (req, res) => {
  const { cardName, userID } = req.params;
  // const page = req.query.page || 0;
  // const cardsPerPage = 10;
  // Regex to remove any special characters and successive withspaces with a single white space
  const card_name = cardName.replace(/[^\w\+]+/g, '-').toLowerCase();
  console.log(cardName)
  console.log(card_name)
  try {
    const results = await Card.find(
      {
        _card_name: cardName,
        _published: { $ne: [] }
      },
      {
        card_faces: 1,
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
        _published: 1,
        _card_name: 1,
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
      query: publishedCards[0].name,
      search: 'catalog'
    })
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
});


// ///////////////////////////////////
// Search Collection by Card Name ////
// ///////////////////////////////////
router.get('/collection/:userID/:queryString', auth, async (req, res) => {

  const { userID, queryString } = req.params;

  if (!queryString) {
    return res.status(400).json({ msg: 'Field is empty' });
  }

  try {
    let user = await User.findOne({ _id: ObjectId(userID) });

    if (!user) {
      return res.status(400).send('User does not exist');
    }

    let cards;
    let query;

    if (queryString === 'all-cards') {
      cards = user.cards
      query = 'All Cards'
    }
    else {
      cards = user.cards.filter((card) => {
        return card._card_name === queryString;
      });
      query = cards[0].name;
    }

    if (!cards) {
      return res.status(400).json({ message: `No result for ${queryString}`, cardName: queryString })
    }

    res.status(200).json({ cards, query, search: 'collection' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ///////////////////////////////////
// Get Collection by User ID /////////
// ///////////////////////////////////
router.get('/collection/:userID', auth, async (req, res) => {
  const { userID, query } = req.params;

  try {
    const user = await User.findOne({ _id: ObjectId(userID) });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const cards = user.cards; 
    // if (cards.length === 0) {
    //   return res.status(400).json({ message: message.noCards });
    // }


    const cardNames = cards.map(card => {
      return card.name;
    }).filter((name, index, array) => {
      return array.indexOf(name) === index;
    })
    
    // Returns card collection and cardNames
    res.status(200).json({ cards: cards, cardNames: cardNames, search: 'collection' });
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
    // console.log(selectedCard)

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

    if (selectedCard.name.includes('//')) {
      const sides = selectedCard.name.split('//').map(side => {
        return side.trim()
      })
      console.log(sides)
      console.log(sides[0] === sides[1])
      if (sides[0] === sides[1]) {
        selectedCard.name = sides[0];
      }
    }

    let newCard
    // Check if card already exists in card catalog
    try {

      newCard = await Card.findOne({ id: cardID });
      // If not, add card card catalog
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

    // console.log(newCard)


    try {
      const user = await User.findOne({ _id: ObjectId(userID) });

      if (!user) {
        return res.status(400).json(message.notFound);
      }

      // Validation function
      // Check if card already exist in user collection
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

      res.status(200).json({ card: newCard, isCardAdded: true });
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
    datePublished,
    publishedID
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
          // 'cards.$.publishedID': publishedID,
          'cards.$.cardName': cardName,
          'cards.$._price': price,
          'cards.$._quantity': quantity,
          'cards.$._condition': condition,
          'cards.$._language': language,
          'cards.$._comment': comment,
          'cards.$._is_banner': banner,
          'cards.$._is_published': published,
          'cards.$._published_id': publishedID,
          'cards.$._date_published': datePublished
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

    const { name, email, country, avatar, rating } = user;

    // If update is published
    if (published) {
      try {
        // Search for existing document.
        const doc = await Card.findOne({
          _id: ObjectId(cardID),
          '_published.publishedID': publishedID
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
              _published: {
                seller: {
                  userID,
                  userName: name,
                  avatar,
                  rating,
                  email,
                  country,
                },
                price,
                quantity,
                language,
                condition,
                comment,
                publishedID
              }
            }
          })
        }
        else {
          // Update existing document
          await Card.updateOne(
            {
              _id: ObjectId(cardID),
              '_published.publishedID': publishedID
            },
            {
              $set: {
                '_published.$.userName': name,
                '_published.$.userEmail': email,
                '_published.$.avatar': avatar,
                '_published.$.rating': rating,
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
            _id: ObjectId(cardID),
          },
          {
            $pull: {
              _published: { publishedID: publishedID }
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
  const { itemID, productID, userID } = await req.body;

  try {
    let user = await User.findOneAndUpdate(
      { _id: ObjectId(userID) },
      {
        // Remove card from user profile cards object
        $pull: {
          cards: { _id: ObjectId(productID) }
        }
      }
    );

    if (!user) {
      return res.status(400).json({ message: 'Card could not be deleted from users collection', isDeleted: false });
    }

    // deleteFromFile(fs, './data', 'cardcatalog.json', { cardID, userID }, 'utf8');

    const card = await Card.findOneAndUpdate(
      { _id: ObjectId(productID) },
      {
        // Remove user from card _owners & card _published
        $pull: {
          _owners: { userID: userID },
          _published: { itemID: itemID }
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
      cards: user.cards
    });
  } catch (error) {
    res.status(500).json(error.message);
  }
});

module.exports = router;
