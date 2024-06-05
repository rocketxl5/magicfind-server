const fs = require('fs');
const express = require('express');
const axios = require('axios');
const router = express.Router();
require('dotenv').config();
const auth = require('../middleware/authorization');
const Card = require('../models/Card');
const User = require('../models/User');
const ObjectId = require('mongodb').ObjectId;

const { handleFiles } = require('../helpers/handleFiles');
const scryfall = require('../data/ALCHEMY');
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
});

// Get scryfall API card title from data/cardnames.json
router.get('/cardnames', async (req, res) => {
  try {
    const names = fs.readFileSync('./data/cardnames.json');
    res.status(200).json(JSON.parse(names));
  } catch (error) {
    throw new Error('Could not fetch cardnames');
  }
});

router.get('/sets', async (req, res) => {
  try {
    const sets = fs.readFileSync('./data/cardsets.json');
    // console.log(sets)
    res.status(200).json(JSON.parse(sets));
  } catch (error) {
    throw new Error('Could not fetch cardsets');
  }
})

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

// // Get catalog published card names
// router.get('/catalog', async (req, res) => {

//   try {
//     const catalogCards = await Card.find(
//       { catalog: { $ne: [] } }
//     )
//     // const data = await fsPromises.readFile('./data/cardcatalog.json', { encoding: 'utf8' });

//     results = catalogCards.map(card => {
//       return card.name
//     }).filter((name, index, array) => {
//       return array.indexOf(name) === index;
//     });

//     res.status(200).json(results);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// /////////////////
// Search Catalog //
// /////////////////

// Get catalog cards by card name
// router.get('/catalog/:cardName', async (req, res) => {
//   const { cardName, userId } = req.params;
//   // const page = req.query.page || 0;
//   // const cardsPerPage = 10;

//   // const card_name = cardName.replace(/[^\w\+]+/g, '-').toLowerCase();
//   try {
//     const results = await Card.find(
//       {
//         card_name: cardName,
//         catalog: { $ne: [] }
//       },
//       {
//         card_faces: 1,
//         finishes: 1,
//         image_uris: 1,
//         layout: 1,
//         name: 1,
//         oversized: 1,
//         oracle_text: 1,
//         released_at: 1,
//         set: 1,
//         set_name: 1,
//         set_uri: 1,
//         type_line: 1,
//         isPublished: 1,
//         card_name: 1,
//       });

//     if (!results.length) {
//       return res.status(400).json({ message: `No result for ${cardName}`, cardName: cardName })
//     }

//     const cards = JSON.parse(JSON.stringify(results));
//     const publishedCards = [];

//     cards.forEach((card) => {
//       card.catalog.forEach((instance) => {
//         const { catalog, ...rest } = card;
//         publishedCards.push(Object.assign(rest, instance));
//       })
//     });
//     res.status(200).json(publishedCards)
//   } catch (error) {
//     res.status(400).json({ message: error.message })
//   }
// });

// /////////////////
// Search Catalog //
// /////////////////
// router.get('/catalog/:cardName/:userId', async (req, res) => {
//   const { cardName, userId } = req.params;
//   // const page = req.query.page || 0;
//   // const cardsPerPage = 10;
//   // Regex to remove any special characters and successive withspaces with a single white space
//   // const card_name = cardName.replace(/[^\w\+]+/g, '-').toLowerCase();
//   // console.log(cardName)
//   // console.log(card_name)
//   try {
//     const results = await Card.find(
//       {
//         card_name: cardName,
//         catalog: { $ne: [] }
//       },
//       {
//         card_faces: 1,
//         card_faces: 1,
//         finishes: 1,
//         image_uris: 1,
//         layout: 1,
//         name: 1,
//         oversized: 1,
//         oracle_text: 1,
//         released_at: 1,
//         set: 1,
//         set_name: 1,
//         set_uri: 1,
//         type_line: 1,
//         isPublished: 1,
//         card_name: 1
//       });

//     if (!results.length) {
//       return res.status(400).json({ message: `No result for card found` })
//     }

//     const cards = JSON.parse(JSON.stringify(results));
//     const filterCards = cards.filter((card) => !card.catalog.includes(userId))

//     const publishedCards = [];

//     filterCards.forEach((card) => {
//       card.catalog.forEach((instance) => {
//         const { catalog, ...rest } = card;
//         publishedCards.push(Object.assign(rest, instance));
//       })
//     });

//     res.status(200).json(publishedCards)
//   } catch (error) {
//     return res.status(400).json({ message: error.message })
//   }
// });


// ///////////////////////////////////
// Search Collection by Card Name ////
// ///////////////////////////////////
// router.get('/collection/:userId/:queryString', auth, async (req, res) => {

//   const { userId, queryString } = req.params;

//   try {
//     let user = await User.findOne({ id: userId });

//     if (!user) {
//       return res.status(400).send('User does not exist');
//     }

//     let cards;

//     if (queryString === 'all') {
//       cards = user.cards;
//     }
//     else {
//       cards = user.cards.filter((card) => {
//         return card.card_name === queryString;
//       });
//     }


//     if (!cards) {
//       return res.status(400).json({ message: `No result for ${queryString}`, cardName: queryString })
//     }

//     res.status(200).json(cards);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// ///////////////////////////////////
// Get Collection by User ID /////////
// ///////////////////////////////////
// router.get('/collection/:userId', auth, async (req, res) => {
//   const { userId } = req.params;
//   // console.log(req.headers.query)
//   try {
//     const user = await User.findOne({ id: userId });
//     if (!user) {
//       return res.status(400).json({ message: 'User not found' });
//     }

//     const cards = user.cards;

//     if (req.headers.query === 'cards') {
//       res.status(200).json({ cards: cards, query: 'Collection Cards' });
//     }

//     if (req.headers.query === 'card_ids') {
//       const collection =
//         new Map([["card_ids", cards.map(card => card.id)], ['names', cards.map(card => {
//           return card.name;
//         }).filter((name, index, array) => {
//           return array.indexOf(name) === index;
//         })]])
//       // Response with card ids and card names
//       res.status(200).json({ card: { ids: collection.get('card_ids'), names: collection.get('names') } });
//     }

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });
router.get('/product/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Card.findOne({ id: id });
    // if card does not exist
    if (!product) {
      //   // trim card object
      res.status(200).json({ isSet: false, method: 'get' })
    }
    else {
      res.status(200).json({ isSet: true, product: product, method: 'get' })
    }
  }
  catch (error) {
    res.status(400).json({ message: error.message })
  }
})

router.post('/add/product', auth, async (req, res) => {

  if (!req.body) {
    throw new Error({ message: 'Missing product data for api/cards/add/product' })
  }
  try {
    const card = await new Card(req.body);
    const success = await card.save();

    if (success) {
      res.status(200).json({ isSet: true, product: card, method: 'post' })
    }
    else {
      throw new Error({ message: 'Product could not be saved to inventory @ api/cards/inventory/add/product' })
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/update/owners/:id', auth, async (req, res) => {
  if (!req.body) {
    throw new Error({ message: 'Missing product data for api/cards/modify/cardId' })
  }

  const { id } = req.params;
  const user = req.body;

  try {
    const doc = await Card.findOneAndUpdate(
      { _id: ObjectId(id) },
      {
        $push: {
          owners: user
        },
      },
      {
        new: true
      }
    );

    if (doc) {
      res.status(200).json({ isSet: true, product: doc, method: null })
    }
    else {
      throw new Error({ message: 'Could not update user owners' });
    }
  } catch (error) {
    res.status(500).json(error);
  }
});

// /////////////////////////////
// Edit Card [Edit, Update]  ///
// /////////////////////////////
router.patch('/edit/:cardID/:userId', auth, async (req, res) => {
  const {
    name,
    price,
    quantity,
    condition,
    language,
    comment,
    isPublished,
    created,
    updated,
    catalogId,
  } = await req.body;

  const { cardID, userId } = req.params;

  try {
    const updatedUser = await User.updateOne(
      {
        _id: ObjectId(userId),
        'cards._id': ObjectId(cardID)
      },
      {
        $set: {
          'cards.$.name': name,
          'cards.$.price': price,
          'cards.$.quantity': quantity,
          'cards.$.condition': condition,
          'cards.$.language': language,
          'cards.$.comment': comment,
          'cards.$.isPublished': isPublished,
          'cards.$.catalogId': catalogId,
          'cards.$.created': created,
          'cards.$.updated': updated
        }
      }
    ); 

    if (!updatedUser) {
      return res.status(400).json({ message: 'Could not update selected card', collection: 'user' });
    }

    const user = await User.findOne({ id: userId });

    if (!user) {
      return res.status(400).json({ message: 'Could not retrieve user data' });
    }

    const { userName, email, country, avatar, rating } = user;

    // If update is published
    if (isPublished) {
      try {
        // Search for existing document.
        const doc = await Card.findOne({
          _id: ObjectId(cardID),
          'catalog.catalogId': catalogId
        })

        // If it does not exist
        if (!doc) {
          // Create document
          const catalogCard = await Card.updateOne(
          {
            _id: ObjectId(cardID)
          },
          {
            $push: {
              catalog: {
                seller: {
                  id,
                  userName,
                  avatar,
                  rating,
                  email,
                  country,
                },
                name,
                catalogId,
                price,
                quantity,
                language,
                condition,
                comment,
                updated,
                isPublished
              }
            }
          })
        }
        else {
          // Update existing document
          await Card.updateOne(
            {
              _id: ObjectId(cardID),
              'catalog.catalodId': catalogId
            },
            {
              $set: {
                'catalog.$.userName': name,
                'catalog.$.userEmail': email,
                'catalog.$.avatar': avatar,
                'catalog.$.rating': rating,
                'catalog.$.userCountry': country,
                'catalog.$.price': price,
                'catalog.$.quantity': quantity,
                'catalog.$.condition': condition,
                'catalog.$.language': language,
                'catalog.$.comment': comment,
                'catalog.$.isPublished': isPublished,
                'catalog.$.updated': updated,
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
              catalog: { catalogId: catalogId }
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
// Delete Card [User.cards, Card.catalog]  ///
// //////////////////////////////////////////////
router.delete('/delete', auth, async (req, res) => {
  const { catalogId, productID, userId } = await req.body;

  try {
    let user = await User.findOneAndUpdate(
      { id: userId },
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

    // deleteFromFile(fs, './data', 'cardcatalog.json', { cardID, userId }, 'utf8');

    const card = await Card.findOneAndUpdate(
      { _id: ObjectId(productID) },
      {
        // Remove user from card owners & card catalog
        $pull: {
          owners: { id: userId },
          catalog: { catalogId: catalogId }
        }
      }
    );

    if (!card) {
      return res.status(400).json({ message: 'Card could not be deleted from cards', isDeleted: false });
    }

    user = await User.findOne({ id: userId });

    if (!user) {
      return res.status(400).json({ message: 'Could not retrieve user data', isDeleted: false });
    }

    res.status(200).json(user.cards);
  } catch (error) {
    res.status(500).json(error.message);
  }
});

module.exports = router;
