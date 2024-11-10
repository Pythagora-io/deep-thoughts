const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');

router.get('/auth/register', (req, res) => {
  res.render('register');
});

router.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).send('Username or email already exists');
    }
    const user = new User({ username, email, password, role: 'creator' }); // Assign 'creator' role by default
    await user.save();
    req.session.userId = user._id;
    req.session.username = user.username; // Preserve username in session
    req.session.userRole = user.role; // Preserve user role in session
    console.log(`New user registered: ${user.username} with role: ${user.role}`);
    res.redirect('/');
  } catch (error) {
    console.error('Registration error:', error);
    console.error(error.stack); // Log the full error stack
    res.status(500).send('Error registering new user');
  }
});

router.get('/auth/login', (req, res) => {
  res.render('login');
});

router.post('/auth/login', async (req, res) => {
  console.log('Received login request body:', req.body); // Added log for received login request body
  try {
    const { login, password } = req.body;
    console.log('Login attempt:', { login }); // Log the login attempt

    const user = await User.findOne({ $or: [{ username: login }, { email: login }] });
    console.log('User found:', user ? 'Yes' : 'No'); // Log if a user was found

    if (!user) {
      console.log('Login failed: User not found');
      return res.status(400).send('Invalid username/email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch); // Log if the password matches

    if (!isMatch) {
      console.log('Login failed: Incorrect password');
      return res.status(400).send('Invalid username/email or password');
    }

    req.session.userId = user._id;
    req.session.username = user.username;
    req.session.userRole = user.role;
    console.log('Login successful:', { userId: user._id, username: user.username, role: user.role });

    res.redirect('/');
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send('Error logging in');
  }
});

router.get('/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error during session destruction:', err);
      return res.status(500).send('Error logging out');
    }
    res.redirect('/auth/login');
  });
});

module.exports = router;