require('dotenv').config();
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/authorization');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

router.post(
  '/',
  body('userName').not().isEmpty(),
  body('recipientName').not().isEmpty(),
  body('subject').not().isEmpty(),
  body('text').not().isEmpty(),
  auth,
  async (req, res) => {
    const errors = validationResult(req);
    const date = Date.now();

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userName, recipientName, subject, text, conversationID } =
      await req.body;

    // Create new message

    try {
      let sender = await User.findOne({ name: userName });
      let recipient = await User.findOne({ name: recipientName });

      if (!sender) {
        return res
          .status(400)
          .json({ errors: [{ message: 'User does not exist' }] });
      }

      // console.log(sender);

      if (!recipient) {
        return res
          .status(400)
          .json({ errors: [{ message: 'Recipient does not exist' }] });
      }

      // console.log(recipient);

      let message = await new Message({
        subject: subject,
        from: sender.name,
        to: recipient.name,
        text: text
      });

      if (!message) {
        return res.status(400).json({
          message: 'There was a problem proceding with Message'
        });
      }

      console.log(message);

      await message.save();

      // If conversation already exists
      if (conversationID) {
        try {
          let conversation = await findOne({ _id: conversationID });

          // If conversation is not loaded
          if (!conversation) {
            return res.status(400).json({
              message:
                'There was a problem. Converssation did not load properly'
            });
          }

          await message.save();

          await Conversation.updateOne(
            {
              _id: conversationID
            },
            {
              $push: {
                messages: {
                  from: sender.name,
                  to: recipient.name,
                  text
                }
              }
            }
          );

          res.status(200).json({ message: 'Message was successfully sent' });
        } catch (err) {
          res.status(500).json({ message: err.message });
        }
      } else {
        try {
          conversation = await new Conversation({
            subject: subject,
            messages: { message }
          });

          if (!conversation) {
            return res.status(400).json({
              msg: 'There was a problem. Message was not added to conversation'
            });
          }

          await User.updateOne(
            { name: recipient.name },
            {
              $push: {
                conversations: {
                  conversation: conversation._id,
                  sentFrom: sender.name,
                  text,
                  subject,
                  read: false,
                  sentDate: date
                }
              }
            }
          );
          await User.updateOne(
            { name: sender.name },
            {
              $push: {
                conversations: {
                  conversationID: conversation._id,
                  sentTo: recipient.name,
                  text: text,
                  subject: subject,
                  sentDate: date
                }
              }
            }
          );

          await conversation.save();
        } catch (err) {
          res.status(500).json({ message: err.message });
        }
      }

      // Create a new conversation

      // const conversationID = conversation._id;
      // const isRead = conversation.messages[0].read;

      // console.log(conversationID);
      // console.log(isRead);

      // await User.updateOne(
      //   { _id: recipientID },
      //   {
      //     $push: {
      //       conversations: {
      //         conversationID,
      //         sentFrom: userID,
      //         text,
      //         subject,
      //         isRead,
      //         sentDate: date
      //       }
      //     }
      //   }
      // );
      // await User.updateOne(
      //   { _id: userID },
      //   {
      //     $push: {
      //       conversations: {
      //         conversationID,
      //         sentTo: recipientID,
      //         text: text,
      //         subject: subject,
      //         sentDate: date
      //       }
      //     }
      //   }
      // );

      res.status(200).json({ data: conversation });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
