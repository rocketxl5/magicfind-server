const express = require('express');
const session = require('express-session');
const wokeDyno = require('woke-dyno');
const connectDB = require('./config/db');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();
const { CronJob } = require('cron');
const { jobs } = require('./helpers/jobs.js')
const { updateCardList } = jobs;
const app = express();
const PORT = process.env.PORT || 5000;
connectDB();

app.use(express.json());
app.use(cors({ origin: '*', credentials: true }));

const SELF_URL = 'https://magicfind-server.onrender.com/';

// Periodic call [15 minutes] to prevent server from going to sleep
const dynoWaker = wokeDyno(SELF_URL);

// Update card names list @ data/cardnames.json
const job = new CronJob(
    '0 0 * * *',
    () => {
        try {
            // Call job fuction
            updateCardList()
            const message = `${new Date().toUTCString()} : Card list was successfuly updated\n`;
            // Update log file data
            fs.appendFile('logs.txt', message, (error) => {
                if (error) throw error
            })
        } catch (error) {
            console.log(error)
        }
    },
    null,
);

job.start();

const usersRouter = require('./routes/users.js');
const cardsRouter = require('./routes/cards.js');
const conversationsRouter = require('./routes/conversations.js');
const mailRouter = require('./routes/mail.js');
const catalogRouter = require('./routes/catalog.js');
const cartRouter = require('./routes/cart.js');

app.use('/api/users', usersRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/mail', mailRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/cart', cartRouter);

app.listen(PORT, () => {
    dynoWaker.start();
    console.log(`Server started on port: ${PORT}`)
});
