$(function() {
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var CURRENT_USER = null;

  // Initialize varibles
  var $window = $(window);
  var $usernameInput = $('.usernameInput'); // Input for username
  var $messages = $('.messages'); // Messages area
  var $inputMessage = $('.inputMessage'); // Input message input box

  var $loginPage = $('.login.page'); // The login page
  var $chatPage = $('.chat.page'); // The chatroom page

  // Prompt for setting a username
  var username;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $usernameInput.focus();

  var socket = io();

  // Förtälj hur många personer som är inloggade
  function addParticipantsMessage(data) {
    var inlogg = data.numUsers === 1 ? ' bara du här. :(' : data.numUsers + ' personer inloggade just nu.';
    log('Det är ' + inlogg);
  }

  // Sätt användarens namn
  function setUsername() {
    username = cleanInput($usernameInput.val().trim());
    if (!username) {
      alert('Skriv in ett namn!');
      return;
    } else {
      // Skicka användarnamnet till servern
      socket.emit('add user', username);
    }
  }

  // Sends a chat message
  function sendMessage() {
    var message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: username,
        message: message
      });
      // tell server to execute 'new message' and send along one parameter
      socket.emit('new message', {msg: message});
    }
  }

  // Log a message
  function log(message, options) {
    var $el = $('<div>').addClass('time').addClass('message').html('<time>' + message + '</time>');
    addMessageElement($el, options);
  }

  var User = {
    name: CURRENT_USER
  };

  var Commands = {
    colorMe: function(color) {
      console.debug(color);
      if (color === undefined) {
        socket.emit('new color');
      } else {
        socket.emit('new color', color);
      }
    },
    list: function() {
      socket.emit('list users');
    },
    help: function() {
      log("Tillgängliga kommandon:");
      log("/list - Lista över alla användare");
      log("/colorme <färg> - Ändra din färg");
    }
  };

  function runCommand(usr, cmd, args) {
    if (usr !== CURRENT_USER) {
      return;
    }

    console.log("Command:" +  cmd);
    console.log("Args:" + args);

    switch(cmd) {
      case 'colorme':
        Commands.colorMe(args[0]);
        break;
      case 'list':
        Commands.list();
        break;
      case 'help':
        Commands.help();
        break;
      default:
        return;
    }
  }

  // Adds the visual chat message to the message list
  function addChatMessage(data, options) {

        if (data.message.substring(0, 1) === "/") {
            runCommand(data.username, data.message.toLocaleLowerCase().split('/')[1].split(' ')[0], data.message.split(' ').splice(1));
            return;
        }

        // Don't fade the message in if there is an 'X was typing'
        var $typingMessages = getTypingMessages(data);
        options = options || {};
        if ($typingMessages.length !== 0) {
            options.fade = false;
            $typingMessages.remove();
        }

        var $messageBodyDiv = $('<p>').text(data.username + ": " + data.message).css('background-color', data.color);

        if (data.message.toLocaleLowerCase().indexOf('rowsa') !== -1) {
            $messageBodyDiv = $('<p>').text(data.username + ": " + data.message).css('background-color', '#fa99e7');
        }

        var typingClass = data.typing ? 'other typing' : 'other';
        if (data.username === CURRENT_USER) {
            typingClass = 'me';
        }
        var $messageDiv = $('<div class="message">')
            .data('username', data.username)
            .addClass(typingClass)
            .append($messageBodyDiv);

        addMessageElement($messageDiv, options);
    }

  // Adds the visual chat typing message
  function addChatTyping(data) {
    data.typing = true;
    data.message = '…';
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  function removeChatTyping(data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }



  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  function addMessageElement(el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
    window.scrollTo(0, document.body.scrollHeight);
  }

  // Prevents input from having injected markup
  function cleanInput(input) {
    return $('<div/>').text(input).text();
  }

  // Updates the typing event
  function updateTyping() {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  function getTypingMessages(data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // Keyboard events
  $window.keydown(function (event) {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      }
    }
  });

  $inputMessage.on('input', function() {
    updateTyping();
  });

  $('#submitName').on('click', function() {
    setUsername();
  });

  $(window).on('load', function() {
    if (localStorage.getItem('currentUser') !== null || localStorage.getItem('currentUser') !== "") {
      $('.usernameInput').val(localStorage.getItem('currentUser'));
    }
  });

  // Focus input when clicking anywhere on login page
  $loginPage.click(function () {
    $currentInput.focus();
  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(function () {
    $inputMessage.focus();
  });

  // Socket events
  socket.on('list users', function(data) {
    log("Personer online: " + data.list.join(','));
  });

  // Whenever the server emits 'login', log the login message
  socket.on('login', function(data) {
    connected = true;
    // Display the welcome message
    localStorage.setItem('currentUser', data.username);
    var message = 'Du är nu inloggad '+data.username+'!<br>Skriv /help för att se tillgängliga kommandon!';
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
    $loginPage.fadeOut();
    $chatPage.show();
    $loginPage.off('click');
    $currentInput = $inputMessage.focus();
    $('header').addClass('reading');

    CURRENT_USER = username;
  });

  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', function(data) {
    addChatMessage(data);
  });

  socket.on('changed color', function(data) {
    log(data.username + ' har ny färg. Närmare bestämt ' + data.color + '.');
  });

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on('user joined', function (data) {
    log(data.username + ' gick med.');
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on('user left', function (data) {
    log(data.username + ' lämnade chatten.');
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on('typing', function (data) {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop typing', function (data) {
    removeChatTyping(data);
  });

  // If there is an error during login
  socket.on('login error', function(data) {
    alert(data.error);
  });
});
