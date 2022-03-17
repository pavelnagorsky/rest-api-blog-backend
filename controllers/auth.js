const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

const errorHandler = require('../util/errorHandler');
const User = require('../models/user');
const jwtConfig = require('../config/jwtToken');

exports.signup = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed.');
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;
  bcrypt.hash(password, 12)
    .then(hashedPw => {
      const user = new User({
        email: email,
        password: hashedPw,
        name: name
      })
      return user.save();
    })
    .then(result => {
      res.status(201).json({
        message: "User created!",
        userId: result._id
      })
    })
    .catch(err => errorHandler(err, next))
}

exports.login = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadedUser;
  User.findOne({ email: email })
    .then(user => {
      if (!user) {
        const error = new Error('No user with this email found.');
        error.statusCode = 401; // no authenticated
        throw error;
      }
      loadedUser = user;
      return bcrypt.compare(password, user.password);
    })
    .then(isEqual => {
      if (!isEqual) {
        const error = new Error('Wrong password.');
        error.statusCode = 401; // no authenticated
        throw error;
      }
      const token = jwtConfig(loadedUser);
      res.status(200).json({
        token: token,
        userId: loadedUser._id.toString()
      })
    })
    .catch(err => errorHandler(err, next))
}