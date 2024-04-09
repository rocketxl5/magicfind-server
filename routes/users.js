const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { body, validationResult } = require('express-validator');

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
            { expiresIn: 36000 },
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
    console.log(req.body)

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

        console.log(avatar)

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

////////////////////////////
// User Store //////////////
////////////////////////////
router.get('/store/:userID', async (req, res) => {
    const { userID } = req.params;
    try {
        const user = await User.findOne({ _id: userID })

        if (user) {
            console.log(user)
            res.status(200).json(user)
        }
    } catch (error) {
        throw new Error(error)
    }
})

module.exports = router;