const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const auth = require('../middleware/authorization')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const ObjectId = require('mongodb').ObjectId


////////////////////////////
// Get Users ///////////////
////////////////////////////
router.get('/', async (req, res) => {
    try {
        const users = await User.find()

        res.status(200).json({ data: users })
    } catch (error) {
        res.status(500).json({ message: err.message })
    }
})

////////////////////////////
// Sign In /////////////////
////////////////////////////
router.post('/login', async (req, res) => {

    const { email, password } = await req.body;

    const message = {
        failed: {
            type: 'error',
            title: 'Connexion failed',
            body: 'Incorrect username or password.'
        },
        server: {
            type: 'error',
            title: 'Server issue',
            input: 'Server cannot process request',

        }
    }

    try {
        const user = await User.findOne({ email })

        if (!user) {
            return res.status(400).json(message.failed)
        }

        try {
            const isMatch = await bcrypt.compare(password, user.password)

            if (!isMatch) {
                return res.status(400).json(message.failed)
            }

        } catch (error) {
            throw new Error(error)
        }

        const payload = {
            user: {
                // Convert moongoose object id to string
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                rating: user.rating
            }
        }

        jwt.sign(
            payload,
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: 86400 },
            (error, token) => {
                if (error) {
                    throw new Error(error)
                }

                res.status(200).json({ token, payload })
            }
        )
    } catch (error) {
        throw new Error(error)
    }
})

////////////////////////////
// Sign Up /////////////////
////////////////////////////
router.post('/signup', async (req, res) => {

    const { name, email, country, password } = req.body
    const message = {
        success: {
            type: 'success',
            name: `${name}`,
            title: 'Congratulations',
            body: 'Your Magic Find account was successfully created. Log in to start building your store and card collection.'
        },
        error: {
            name: 'Username is already taken',
            email: 'Email is already taken',
            password: 'Please provide a password',
            country: 'Please select a country'
        }
    }

    try {
        // Check if name is available
        const userName = await User.findOne({ name })

        // Throw error if name exist
        if (userName) {
            // throw new Error(message.error.username)
            return res.status(400).json(message.error.name)
        }

        // Check if email is available
        const userEmail = await User.findOne({ email })

        // Throw error if email exist
        if (userEmail) {
            // throw new Error(message.error.email)
            return res.status(400).json(message.error.email)
        }

        // Define avatar params
        // https://css-tricks.com/snippets/javascript/random-hex-color/
        const avatar = {
            src: '',
            color: Math.floor(Math.random() * 16777215).toString(16),
            letter: name.charAt(0).toUpperCase()
        }

        const rating = 0;

        if (password && country) {
            const newUser = new User({
                name,
                email,
                country,
                password,
                avatar,
                rating
            })
            // Hash Password
            const salt = await bcrypt.genSalt(10);
            newUser.password = await bcrypt.hash(password, salt);

            await newUser.save()

            res.status(200).json({ message: message.success })
        } else {

            const errMessage = !password ? message.error.password : message.error.country
            return res.status(400).json(errMessage)
        }

    } catch (error) {
        throw new Error(error)
    }
});

/////////////////////////////////
// User Collection //////////////
/////////////////////////////////
router.get('/collection/:userId', auth, async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findOne({ _id: ObjectId(userId) });

        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        const cards = new Map([
            ["ids", user.cards.map(card => card.card_id)],
            ['names', user.cards.map(card => {
                return card.name;
            })
                .filter((name, index, array) => {
                    return array.indexOf(name) === index;
                })]
        ]);

        // Response assigns array of ids and array of names to respective properties
        res.status(200).json({ card: { ids: cards.get('ids'), names: cards.get('names') } });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});


router.get('/collection/:userId/:query', auth, async (req, res) => {
    const { userId, query } = req.params;

    try {
        const user = await User.findOne({ id: ObjectId(userId) });

        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        // If query is for cards
        if (query === 'all') {
            // Return user card collection
            res.status(200).json(user.cards);
        }
        else {
            const cards = user.cards.filter((card) => {
                return card.card_name === query;
            });
            res.status(200).json(cards);
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.patch('/:userId/add/card', auth, async (req, res) => {
    if (!req.body) {
        throw new Error({ message: 'Missing card data for api/users/collection/:userId/add/product' })
    }
    const { userId } = req.params;
    const card = req.body;    

    try {
        // const filter = { _id: ObjectId(userId) };
        // const update = { $push: { cards: req.body } };
        const doc = await User.findOneAndUpdate(
            { _id: ObjectId(userId) },
            {
                $push: {
                    cards: card
                }
            },
            // () => console.log(`${card.name} was successfully added to collection`)
        );

        if (doc) {
            res.status(200).json({ isSet: true, product: card, method: 'patch' })
        }
        else {
            throw new Error({ message: 'Could not update user collection' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})

////////////////////////////
// User Store //////////////
////////////////////////////
router.get('/store/:userId', auth, async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findOne({ id: userId })

        if (user) {
            const publishedCards = user.cards.filter(card => card.isPublished)
            res.status(200).json(publishedCards)
        }
    } catch (error) {
        throw new Error(error)
    }
});

router.post('/store/:userId', auth, async (req, res) => {
    const { userId } = req.params;
    // console.log(userId)
    const data = req.body;
    // console.log(data)

    // const user = await User.findOne({ id: userId });

    // if (user) {
    const updated = User.updateOne(
        { id: userId },
        {
            $push: {
                store: data
            }
        },
        () => console.log(`${newCard.name} successfully added to store`)
    );
    // }
    if (updated) {
        console.log(updated)
        // res.status(200).json(updated)
    }
})

module.exports = router;