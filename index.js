var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io')(server),
    port = 3000,
    randomColor = require('randomcolor');

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// usernames which are currently connected to the chat
var usernames = [];
var numUsers = 0;
var userColors = [];

io.on('connection', function (socket) {
  var addedUser = false;

  socket.on('list users', function() {
    socket.emit('list users', {
      list: usernames
    });
  });

  // When the client requests a new color
  socket.on('new color', function(color) {
    // If there was no color set
    if (!color) {
      // Create random new one that's greeny
      userColors[usernames.indexOf(socket.username)] = randomColor({luminosity: 'light', hue: 'green'});
    } else {
      // If one is set, use it
      userColors[usernames.indexOf(socket.username)] = color;
    }
    io.sockets.emit('changed color', {
      username: socket.username,
      color: userColors[usernames.indexOf(socket.username)]
    });
  });

  // When the client emits a new message it gets broadcasted 
  // to all clients except the one sending it
  socket.on('new message', function(data) {
    socket.broadcast.emit('new message', {
      username: socket.username,
      color: userColors[usernames.indexOf(socket.username)],
      message: data.msg
    });
  });

  // When the client adds a user
  socket.on('add user', function(username) {
    if (username.length > 14) {
      socket.emit('login error', {
        error: "Username too long"
      });
      return;
    }
    if (username.length < 3) {
      socket.emit('login error', {
        error: "Username too short"
      });
      return;
    }

    // We store the username in the socket session for this client
    socket.username = username;
    // Add the client's username to the global list
    if (usernames.indexOf(username) === -1) {
      usernames.push(username);
      userColors.push(randomColor({luminosity: 'light', hue: 'green'}));
    }
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers,
      username: username
    });
    // Echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // When the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // When the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // When the user disconnects
  socket.on('disconnect', function () {
    // remove the username from global usernames list
    if (addedUser) {
      //delete usernames[socket.username];
      var index = usernames.indexOf(socket.username);
      if (index !== -1) {
        usernames.splice(index, 1);
      }
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});
