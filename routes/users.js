const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
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
router.post('/login',
    body('email').not().isEmpty(),
    body('password').isLength({ min: 3 }),
    async (req, res) => {

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            errors.array()
            // return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = await req.body;

        const messages = {
            invalid: {
                type: 'error',
                title: `Connexion failed`,
                body: 'The email or password you provided is invalid. Please try again.'
            },
            server: {
                type: 'error',
                title: 'Server issue',
                input: 'Server cannot process your request',

            }
        }

        try {
            const user = await User.findOne({ email })

            if (!user) {
                return res.status(400).json(messages.invalid)
            }

            try {
                const isMatch = await bcrypt.compare(password, user.password)

                if (!isMatch) {
                    return res.status(400).json(messages.invalid)
                }

            } catch (error) {
                throw new Error(error)
            }

            const payload = {
                user: {
                    id: user.id
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

                    res.status(200).json({ token, user })
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


    const { name, email, country, password } = await req.body
    console.log(name, email, country, password)
    const messages = {
        success: {
            title: `Congratulations ${name}!`,
            body: 'Your new Magic Find account was successfully created.'
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
            // throw new Error(messages.error.username)
            return res.status(400).json(messages.error.name)
        }

        console.log(userName)
        // Check if email is available
        const userEmail = await User.findOne({ email })

        // Throw error if email exist
        if (userEmail) {
            // throw new Error(messages.error.email)
            return res.status(400).json(messages.error.email)
        }

        if (password && country) {
            const newUser = new User({
                name,
                email,
                country,
                password,
            })
            // Hash Password
            const salt = await bcrypt.genSalt(10);
            newUser.password = await bcrypt.hash(password, salt);


            await newUser.save()

            res.status(200).json({ message: messages.success })
        } else {

            const message = !password ? messages.error.password : messages.error.country
            return res.status(400).json(message)
        }

    } catch (error) {
        // res.status(500).json(error.message);
        throw new Error(error)
    }
})


module.exports = router;