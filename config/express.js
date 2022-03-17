const express = require('express');
// const Mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();

const multer = require('../middleware/multer');
const headers = require('../middleware/headers');
const feedRoutes = require('../routes/feed');
const authRoutes = require('../routes/auth');

const app = express();

module.exports = () => {
  // data parsers config
  app.use(bodyParser.json());
  app.use(multer);

  // headers config
  app.use(headers);

  // static dir
  app.use("/images", express.static('images'));

  // routes
  app.use('/feed', feedRoutes);
  app.use('/auth', authRoutes);

  // error handling
  app.use((error, req, res, next) => {
    console.log(error);
    const status = error.statusCode || 500;
    const message = error.message;
    res.status(status).json({ message: message });
  });

  return app;
}