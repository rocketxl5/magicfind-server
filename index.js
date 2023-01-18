require('dotenv').config();
const express = require('express');
// const mongoose = require('mongoose');
const connectDB = require('./config/db');
const app = express();
const cors = require('cors');
const PORT = process.env.PORT || 5000;
connectDB();

app.use(cors({ origin: '*', credentials: true }));

app.use(express.json());

/////////////////////////
// Request to Homepage //
/////////////////////////
// app.get('/', (req, res) => res.send('API Homepage'));

///////////////////
// Get All Users //
///////////////////
// app.get('/api/users', (req, res) => {});

const usersRouter = require('./routes/users.js');
const cardsRouter = require('./routes/cards.js');
const conversationsRouter = require('./routes/conversations.js');
const messagesRouter = require('./routes/messages.js');
const catalogRouter = require('./routes/catalog.js');
const cartRouter = require('./routes/cart.js');

app.use('/api/users', usersRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/cart', cartRouter);

app.listen(PORT, () => console.log(`Server started on port: ${PORT}`));
