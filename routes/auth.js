const express = require('express');
const { body } = require('express-validator');

const authControllers = require('../controllers/auth');
const User = require('../models/user');

const router = express.Router();

router.put("/signup", [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email.')
    .custom( async (value, { req }) => {
      const userDoc = await User.findOne({ email: value })
      if (userDoc) {
        throw new Error("E-Mail already exists");
      } 
      return true;
    })
    .normalizeEmail(),
  body('password')
    .trim()
    .isLength({ min: 5 }),
  body('name')
    .trim()
    .not()
    .isEmpty()
], authControllers.signup);

router.post('/login', authControllers.login);

module.exports = router;