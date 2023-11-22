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
      return !/^[A\-]+/.test(cardname)
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
    const { cardID, userID } = await req.params;
    const selectedCard = await req.body;

    // console.log('cardid', cardID)
    // console.log('userid', userID)

   let card = {}

  //  for(const prop in selectedCard) {
  //   if(cardProps.includes(prop.toString())) {
  //     card = {...card, [prop]: selectedCard[prop]}
  //   }
  //  } 

    try {

      const user = await User.findOne({ _id: userID });

      if(!user) {
        return res.status(400).send('No corresponding user found');
      }

      const newCard = await new Card(selectedCard);

      if (!newCard) {
        console.log('cant create new card')
        return res
          .status(400)
          .json({ message: 'There was a problem. Card not added to collection' });
      }

      // const card = await Card.findOne({_id: ObjectId(newCard.id)});
      // console.log(card)
      // if(!card) {
      //   return res.status(400).send('No card found');
      // }
    
      await newCard.save();
      res.send(newCard);
    } catch(error) {
      
      res.send(error);
    }

    // res.send({user: userID, card: cardID})
    // let { card, userID } = await req.body;
    // console.log(selectedCards)
    // Destructure request body
    // const {
    //   userID,
    //   id,
    //   artist,
    //   booster,
    //   colors,
    //   finish,
    //   frame,
    //   image_uris,
    //   lang,
    //   legalities,
    //   mana_cost,
    //   name,
    //   oversized,
    //   prices,
    //   rarity,
    //   released,
    //   set_name,
    //   type_line,
    // } = await req.body;

    // console.log(card)


    // console.log(cards)
    // console.log(userID)

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

    // newProps.forEach(prop => {
    //   card = { ...card, [prop[index]]: prop }
    // })

    // console.log(card)

    // try {

      
      // const filterSelectedCards = (
      //   await Promise.all(
      //     cards.map(async (card) => {
      //       const cardExist = await !Card.findOne({
      //         id: card.id
      //       }).catch((error) => console.log(error.message))
      //       if (!cardExist) {
      //         return card;
      //       }
      //     })
      //   )
      // )

      // if (!filterSelectedCards.length) {
      //   return res.status(400).json({ message: 'The cards you selected are already in your collection' })
      // }
      // console.log(cards)
      // const newCards = await new Card.insertMany(cards)

      // if (!newCards) {
      //   return res.status(400).json({ message: 'Something happen. Cards were not added to your collection' });
      // } 



      // await newCard.save();

      // console.log(filterSelectedCards)
      // res.send({ data: newCard });

    // } catch (error) {
    //   res.send(error.message);
    // }

    // Card.insertMany
    // Create a new card
    // const newCard = await new Card({
    //   id,
    //   artist,
    //   booster,
    //   colors,
    //   finish,
    //   frame,
    //   image_uris,
    //   lang,
    //   legalities,
    //   mana_cost,
    //   name,
    //   oversized,
    //   prices,
    //   rarity,
    //   released,
    //   set_name,
    //   type_line,
    //   asking_price,
    //   condition,
    //   comment,
    //   isPublished,
    //   datePublished,
    //   quantity,
    //   userID,
    //   userName,
    //   userCountry,
    // });

    //   if (!newCard) {
    //     console.log('cant create new card')
    //     return res
    //       .status(400)
    //       .json({ msg: 'There was a problem. Card not added to collection' });
    //   }
    //   console.log(newCard);
    // userID = ObjectId(userID);
    // console.log(userID)
    //   // Add newCard from current user cards object
    //   User.updateOne(
    //     { _id: userID },
    //     {
    //       $push: {
    //         cards: { ...newCard }
    //       }
    //     },
    //     () => console.log(`${name} successfully added to store`)
    //   );

    //   appendToFile(fs, './data/cardcatalog.json', newCard, 'utf8');

    //   await newCard.save();

    // res.send({ message: 'Card successully added to your store', data: req.body });
    // res.send({ data: cards });
    // } catch (error) {
    //   res.status(500).json({ message: error.message });
    // }
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
