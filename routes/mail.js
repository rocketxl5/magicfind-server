require('dotenv').config();
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/authorization');
const User = require('../models/User');
const Message = require('../models/Message');
const Thread = require('../models/Thread');
const ObjectId = require('mongodb').ObjectId;

// Returns array of sorted messages by descending date order
const sortMessagesByDate = (messages) => {
  return messages.sort((a, b) => {
    return b.date - a.date;
  });
};

const getMessages = (messages) => {
  return messages.filter((message) => {
    return !message.isTrash;
  });
};

const getTrashedMessages = (messages) => {
  return messages.filter((message) => {
    return message.isTrash && !message.isDeleted;
  });
};

// Add new message to sender and user messages profile
router.post(
  '/',
  body('userName').not().isEmpty(),
  body('recipientName').not().isEmpty(),
  body('subject').not().isEmpty(),
  body('text').not().isEmpty(),
  auth,
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      userName,
      recipientName,
      subject,
      text,
      isReply,
      messageID,
      threadID
    } = await req.body;

    try {
      let sender = await User.findOne({ name: userName });
      let recipient = await User.findOne({ name: recipientName });
      let thread = {};

      if (!sender || !recipient) {
        return res
          .status(400)
          .json({ message: `Zoinks! ${userName} is not a registered user.` });
      }

      // If new message is not a reply, create a new thread
      if (!isReply) {
        thread = await new Thread({
          messages: []
        });

        await thread.save();
      }

      if (isReply) {
        thread = await Thread.findOne({ _id: threadID });
      }

      let message = await new Message({
        sender: sender.name,
        recipient: recipient.name,
        subject: subject,
        text: text
      });

      await message.save();

      await User.updateOne(
        { name: sender.name },
        {
          $push: {
            'messages.sent': {
              _id: message._id,
              recipient: recipient.name,
              subject: subject,
              text: text,
              date: message.sentDate,
              isRead: true,
              isTrash: message.isTrash,
              isDeleted: message.isDeleted,
              isSent: true,
              isReply: isReply,
              repliesTo: !messageID ? 'undefined' : messageID,
              threadID: thread._id
            }
          }
        }
      );

      await User.updateOne(
        { name: recipient.name },
        {
          $push: {
            'messages.received': {
              _id: message._id,
              sender: sender.name,
              subject: subject,
              text: text,
              date: message.sentDate,
              isRead: message.isRead,
              isTrash: message.isTrash,
              isDeleted: message.isDeleted,
              isSent: message.isSent,
              isReply: message.isReply,
              repliesTo: !messageID ? 'undefined' : messageID,
              threadID: thread._id
            }
          }
        }
      );

      res.status(200).json({
        message: 'Request sent successfully to messages route',
        data: [sender, recipient]
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: 'Shucks! Something went wrong in the back end.' });
    }
  }
);

// Get messages from user inbox
router.get('/:userID', auth, async (req, res) => {
  const { userID } = req.params;

  try {
    let user = await User.findOne({ id: userID });

    if (!user) {
      return res.status(400).json({
        message: `Warning: user ${userID} is not listed in the database`
      });
    }

    // Get received messages
    let inMail = await user.mail.received;
    // console.log(messages);
    if (!inMail) {
      return res
        .status(400)
        .json({ message: 'User messagers could not be retrieved' });
    }

    // Get received messages excluding trashed messages
    const filteredMail = inMail.filter((message) => {
      return !message.isTrash;
    });

    // console.log(filteredMessages);

    const sortedMail = filteredMail.sort((a, b) => {
      return b.date - a.date;
    });

    res.status(200).json(sortedMail);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get messages from user sent box
router.get('/sent/:userID', auth, async (req, res) => {
  const { userID } = req.params;

  try {
    let user = await User.findOne({ _id: userID });

    if (!user) {
      return res.status(400).json({
        message: `Warning: user ${userID} is not listed in the database`
      });
    }

    // Get messages sent
    let outMail = await user.mail.sent;

    if (!outMail) {
      return res
        .status(400)
        .json({ message: 'User messagers could not be retrieved' });
    }

    // Get received messages excluding trashed messages
    const filteredMail = outMail.filter((message) => {
      return !message.isTrash;
    });

    // console.log(filteredMessages);

    const sortedMail = filteredMail.sort((a, b) => {
      return b.date - a.date;
    });

    res.status(200).json({ data: sortedMail });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get unread messages
router.get('/unread/:userID', auth, async (req, res) => {
  const { userID } = req.params;

  try {
    let user = await User.findOne({ _id: ObjectId(userID) });

    if (!user) {
      return res.status(400).json({
        message: `Warning: user ${userID} is not listed in the database`
      });
    }

    let inMail = await user.mail.received;

    const filteredMail = inMail.filter((message) => {
      return !message.isRead && !message.isTrash;
    });

    const sortedMail = filteredMail.sort((a, b) => {
      return b.date - a.date;
    });
    console.log(sortedMail)
    res.status(200).json(sortedMail);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get messages from user trash bin
router.get('/trash/:userID', auth, async (req, res) => {
  const { userID } = req.params;

  try {
    let user = await User.findOne({ _id: ObjectId(userID) });

    if (!user) {
      return res.status(400).json({
        message: `Warning: user ${userID} is not listed in the database`
      });
    }

    const inMail = await user.mail.received.filter((message) => {
      return message.isTrash;
    });

    const outMail = await user.mail.sent.filter((message) => {
      return message.isTrash;
    });

    const mail = [];
    mail.push(...inMail);
    mail.push(...outMail);

    sortedMail = mail.sort((a, b) => {
      return b.date - a.date;
    });

    res.status(200).json({ data: sortedMail });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Change isTrash status from false to true for messages sent to the trash bin
router.patch('/', auth, async (req, res) => {
  const { userID, trashed, path } = await req.body;

  try {
    const user = await User.findOne({ _id: ObjectId(userID) });

    if (!user) {
      return res.status(400).json({
        message: `Warning: user ${userID} is not listed in the database`
      });
    }

    let messages = [];
    if (path === 'inbox') {
      messages = user.mail.received;

      trashed.forEach((trashedMessage) => {
        messages.forEach((message) => {
          if (message._id.toString() === trashedMessage._id) {
            message.isTrash = true;
          }
        });
      });

      const updatedUser = await User.updateOne(
        { _id: userID },
        {
          $set: { 'mail.received': messages }
        }
      );
    }
    if (path === 'sent') {
      messages = user.mail.sent;

      trashed.forEach((trashedMessage) => {
        messages.forEach((message) => {
          if (message._id.toString() === trashedMessage._id) {
            message.isTrash = true;
          }
        });
      });

      const updatedUser = await User.updateOne(
        { _id: userID },
        {
          $set: { 'mail.sent': messages }
        }
      );
    }

    const filteredMessages = messages.filter((message) => {
      return !message.isTrash;
    });

    const sortedMessages = filteredMessages.sort((a, b) => {
      return b.date - a.date;
    });

    res.status(200).json({ data: sortedMessages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete selected messages from user's profile
router.delete('/delete', auth, async (req, res) => {
  const { userID, toBeDeleted } = await req.body;

  try {
    const user = await User.findOne({ _id: ObjectId(userID) });

    if (!user) {
      return res.status(400).json({
        message: `Warning: user ${userID} is not listed in the database`
      });
    }

    let outMail = await user.mail.sent;
    let inMail = await user.mail.received;

    // console.log('sentMesssages', sentMail);
    // console.log('receivedMEssages', receivedMail);

    toBeDeleted.forEach((message) => {
      inMail.forEach((receivedMessage, index) => {
        if (receivedMessage._id.toString() === message._id) {
          inMail.splice(index, 1);
        }
      });
    });

    toBeDeleted.forEach((message) => {
      outMail.forEach((sentMessage, index) => {
        if (sentMessage._id.toString() === message._id) {
          outMail.splice(index, 1);
        }
      });
    });

    const updatedMessages = await User.findOneAndUpdate(
      { _id: userID },
      {
        $set: {
          'mail.received': inMail,
          'mail.sent': outMail
        }
      },
      { new: true }
    );

    const messages = [];
    messages.push(...updatedMessages.mail.received);
    messages.push(...updatedMessages.mail.sent);

    filteredMessages = messages.filter((message) => {
      return message.isTrash;
    });

    sortedMessages = filteredMessages.sort((a, b) => {
      return b.date - a.date;
    });

    res.status(200).json({ data: sortedMessages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Modify/Update isRead property value of single message
router.patch('/read', auth, async (req, res) => {
  const { userID, messageID, isReadStatus } = await req.body;

  try {
    const updatedUser = await User.updateOne(
      { _id: ObjectId(userID), 'mail.received._id': ObjectId(messageID) },
      {
        $set: {
          'mail.received.$.isRead': isReadStatus
        }
      },
      { upsert: true }
    );

    if (!updatedUser) {
      return res.status(400).json({
        errors: [{ message: 'Well... isRead status could not be modified.' }]
      });
    }

    res.status(200).json({ status: 200, data: updatedUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Modify/Update isTrash property value of single message
router.patch('/trash', auth, async (req, res) => {
  const { userID, messageID, isSentMessage, isTrashStatus } = await req.body;
  let updatedUser = {};

  try {
    // If message is received from another user
    if (!isSentMessage) {
      updatedUser = await User.updateOne(
        {
          _id: ObjectId(userID),
          'mail.received._id': ObjectId(messageID)
        },
        {
          $set: {
            'mail.received.$.isTrash': isTrashStatus
          }
        },
        { upsert: true }
      );
    }
    // If message was sent from current user
    if (isSentMessage) {
      updatedUser = await User.updateOne(
        {
          _id: ObjectId(userID),
          'mail.sent._id': ObjectId(messageID)
        },
        {
          $set: {
            'mail.sent.$.isTrash': isTrashStatus
          }
        },
        { upsert: true }
      );
    }

    if (!updatedUser) {
      return res.status(400).json({
        errors: [{ message: 'Well... isTrash status could not be modified.' }]
      });
    }

    res.status(200).json({ status: 200, data: updatedUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
