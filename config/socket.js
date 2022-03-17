module.exports = (server) => {
  const io = require('../socket').init(server);
  io.on('connection', socket => {
    // console.log('client connected');
  });
}