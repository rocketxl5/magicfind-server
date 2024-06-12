// const fs = require('fs');
// const fsPromises = require('fs/promises');
const axios = require('axios');
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

router.get('/test', async (req, res) => {

  let alchemy_cardnames = [];
  let cards = [];
  try {
    // const arena = await axios.get(`https://api.scryfall.com/cards/arena`);
    const response = await axios.get(`https://api.scryfall.com/cards/arena`);
    // const promises = urls.map(async (url) => {
    //   const cards = []
    //   let isFetch = true;
    //   const data = await fetchData(url, isFetch, []);
    //   return cards.push(...cards, ...data)
    // })
    // // Querying all urls returned in urls
    // Promise.all(promises)
    //   .then(cards => cards = cards)
    //   // .then(cards => alchemy_cardnames = cards.map(card => card))
    //   // .then(cards => cards = cards.map(card => card.name))
    //   .catch(error => { throw error })
    // if (arena)
    if (response) {
      console.log(response)
      // res.status(200).json(arena);
    }
  } catch (error) {
    throw new Error(error);
  }

  // try {
  //   const response = await axios.get('https://api.scryfall.com/catalog/card-names');
  //   const cardnames = response.data.data;

  //   // Returns array of cardnames excluding cards begining with A- (Arena cards)
  //   const filteredCardnames = cardnames.filter(cardname => {
  //     return /^(?!A-).*$/.test(cardname) && !alchemy_cardnames.includes(cardname)
  //   });

  //   const searchRedundencies = async (filteredCardnames) => {
  //     try {
  //       const result = await filteredCardnames.map((name, index) => { return { name: name, index: index } })
  //         .filter(obj => { return obj.name.includes('//') })
  //         .map(obj => { return { name: obj.name.split('//').map(el => el.trim()), index: obj.index } })
  //         .filter(obj => { return obj.name[0].includes(obj.name[1]) });
  //       return await result;
  //     } catch (error) {
  //       throw new Error(error);
  //     }
  //   }
  //   const removeRedundencies = async (redundencies, filteredCardnames) => {
  //     await redundencies.forEach((redundency, i) => {
  //       const index = redundency.index - i;
  //       filteredCardnames.splice(index, 1);
  //     });
  //   }

  //   searchRedundencies(filteredCardnames).then((found) => {
  //     removeRedundencies(found, filteredCardnames).then(() => {
  //       // Write changes to file
  //       handleFiles(fs, './data', 'cardnames.json', JSON.stringify(filteredCardnames), true);
  //     })
  //   });
  // } catch (error) {
  //   throw new Error(error);
  // }

})

module.exports = router;
