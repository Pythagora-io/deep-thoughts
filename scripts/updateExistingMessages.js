const mongoose = require('mongoose');
const ChatRoom = require('../models/ChatRoom');
require('dotenv').config();

mongoose.connect(process.env.DATABASE_URL)
  .then(() => console.log('Connected to database'))
  .catch(err => console.error('Database connection error:', err));

async function updateMessages() {
  try {
    const chatRooms = await ChatRoom.find({});
    for (let room of chatRooms) {
      room.messages = room.messages.map(msg => ({
        ...msg,
        sender: msg.sender || 'Anonymous'
      }));
      await room.save();
      console.log(`Updated messages for room: ${room._id}`);
    }
    console.log('All messages updated successfully');
  } catch (error) {
    console.error('Error updating messages:', error);
    console.error(error.stack); // Log the full error stack
  } finally {
    mongoose.disconnect();
  }
}

updateMessages();