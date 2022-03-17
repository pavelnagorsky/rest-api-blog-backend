const Mongoose = require('mongoose');

module.exports = () => Mongoose.connect(process.env.MONGODB_URL);
