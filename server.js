/*****************************************/
/********* Set up the web server.*********/
/* Include static file webserver library */
var static = require('node-static');

/* Include the http server library */
var http = require('http');

/* Assume that we are running on Heroku */
var port = process.env.PORT;
var directory = __dirname + '/public';

/* If we aren't on Heroku, then we need to readjust the port and directory information and we know that beecause port won't be set */
if (typeof port == 'undefined' || !port) {
  directory = './public';
  port = 8080;
}

/* Set up a static web-server that will deliver files from the filesystem */
var file = new static.Server(directory);

/* Construct an http server that gets files from the file server. */
var app = http.createServer(
  function (request, response) {
    request.addListener('end',
      function () {
        file.serve(request, response);
      }
    ).resume();
  }
).listen(port);

console.log('The Server is running.');
/*****************************************/
/***** Set up the web socket server. *****/

/* A registry of socket_ids and player information */
var players = [];
/** console.log(players); */
var io = require('socket.io').listen(app);

io.sockets.on('connection', function (socket) {

  log('Client connection by ' + socket.id);

  function log() {
    var array = ['*** Server log message: '];
    for (var i = 0; i < arguments.length; i++) {
      array.push(arguments[i]);
      console.log(arguments[i]);
    }
    socket.emit('log', array);
    socket.broadcast.emit('log', array);
  }

  /* join_room Command
  /* payload;
  /*  {
  /*    'room': room to join,
  /*    'username': username of person joining room
  /*  }
  /*  join_room_response:
  /*  {
  /*    'result': 'success'
  /*    'room': room to join,
  /*    'username': username of person joining room
  /*    'socket_id: the person that joined.'
  /*    'membership': number of people in the new room including the new one.
  /*  }
  /*  or
  /*  {
  /*    'result': 'fail'
  /*    'message': Failure message
  /*  }
  */
  socket.on('join_room', function (payload) {
    log('\'join_room\' command' + JSON.stringify(payload));

    /* Check that client sent a payload */
    if (('undefined' === typeof payload) || !payload) {
      var error_message = 'join_room had no payload, command aborted';
      log(error_message);
      socket.emit('join_room_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }

    /*a Check that the client has a room to join */
    var room = payload.room;
    if ('undefined' === typeof room || !room) {
      var error_message = 'join_room didn\'t specify a room, command aborted';
      log(error_message);
      socket.emit('join_room_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }

    /* Check that username has been provided */
    var username = payload.username;
    if ('undefined' === typeof username || !username) {
      var error_message = 'join_room didn\'t specify a username, command aborted';
      log(error_message);
      socket.emit('join_room_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }

    /* Store information about new player */
    players[socket.id] = {};
    players[socket.id].username = username;
    players[socket.id].room = room;

    /* Actually have the user join the room */
    socket.join(room);

    /*Get room object */
    var roomObject = io.sockets.adapter.rooms[room];

    /* Tell everyone already in the room that someone just joined */
    var numClients = roomObject.length;
    var success_data = {
      result: 'success',
      room: room,
      username: username,
      socket_id: socket.id,
      membership: numClients
    }
    io.in(room).emit('join_room_response', success_data);

    for (var socket_in_room in roomObject.sockets) {
      var success_data = {
        result: 'success',
        room: room,
        username: players[socket_in_room].username,
        socket_id: socket_in_room,
        membership: numClients
      };
      socket.emit('join_room_response', success_data);
    }

    log('join_room success');

    if (room !== 'lobby') {
      send_game_update(socket, room, 'initial_update');
    }
  });

  socket.on('disconnect', function () {
    log('Client disconnected ' + JSON.stringify(players[socket.id]));
    if ('undefined' !== typeof players[socket.id] && players[socket.id]) {
      var username = players[socket.id].username;
      var room = players[socket.id].room;
      var payload = {
        username: username,
        socket_id: socket.id
      }
      delete players[socket.id];
      io.in(room).emit('player_disconnected', payload);
    }
  });

  /* send_message Command
  /* payload;
  /*  {
  /*    'room': room to join,
  /*    'message': message to send
  /*  }
  /*  send_message_response:
  /*  {
  /*    'result': 'success'
  /*    'username': username of person that "spoke"
  /*    'message': what the person said
  /*  }
  /*  or
  /*  {
  /*    'result': 'fail'
  /*    'message': Failure message
  /*  }
  */
  socket.on('send_message', function (payload) {
    log('Server received a command', 'send_message', payload);
    if (('undefined' === typeof payload) || !payload) {
      var error_message = 'send_message had no payload, command aborted';
      log(error_message);
      socket.emit('send_message_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }

    var room = payload.room;
    if (('undefined' === typeof room) || !room) {
      var error_message = 'send_message did not specify a room, command aborted';
      log(error_message);
      socket.emit('send_message_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }

    var username = players[socket.id].username;
    if (('undefined' === typeof username) || !username) {
      var error_message = 'send_message did not specify a username, command aborted';
      log(error_message);
      socket.emit('send_message_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }

    var message = payload.message;
    if (('undefined' === typeof message) || !message) {
      var error_message = 'send_message did not specify a message, command aborted';
      log(error_message);
      socket.emit('send_message_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }

    var success_data = {
      result: 'success',
      room: room,
      username: username,
      message: message

    };

    io.in(room).emit('send_message_response', success_data);
    log('Message sent to room ' + room + ' by ' + username);

  });
  /* invite_message Command
  /* payload;
  /*  {
  /*    'room': room to join,
  /*    'username': username of person to be invited
  /*    'message': message to send
  /*  }
  /*  invite_response:
  /*  {
  /*    'result': 'success'
  /*    'socket_id': the socket_id of the person being invited
  /*  }
  /*  or
  /*  {
  /*    'result': 'fail'
  /*    'message': Failure message
  /*  }
  /*  invited:
  /*  {
  /*    'result': 'success'
  /*    'socket_id': the socket_id of the person being invited
  /*  }
  /*  or
  /*  {
  /*    'result': 'fail'
  /*    'message': Failure message
  /*  }
  */
  socket.on('invite', function (payload) {
    log('\'invite\' with ' + JSON.stringify(payload));
    /* Check to make sure that there's a payload */
    if (('undefined' === typeof payload) || !payload) {
      var error_message = 'invite had no payload, command aborted';
      log(error_message);
      socket.emit('invite_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }

    /* Check that the message can be traced to a username */
    var username = players[socket.id].username;
    if (('undefined' === typeof username) || !username) {
      var error_message = '\'invite\' can\'t identify who sent the message, command aborted';
      log(error_message);
      socket.emit('invite_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }

    var requested_user = payload.requested_user;
    if (('undefined' === typeof requested_user) || !requested_user) {
      var error_message = '\'invite\' didn\'t specify a requested_user, command aborted';
      log(error_message);
      socket.emit('invite_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }

    var room = players[socket.id].room;
    var roomObject = io.sockets.adapter.rooms[room];
    /* Make sure the user being invited is in the room */
    if (!roomObject.sockets.hasOwnProperty(requested_user)) {
      var error_message = '\'invite\' requested a user that wasn\'t in the room, command aborted';
      log(error_message);
      socket.emit('invite_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }

    /* If everything is ok respond to the inviter that everything is OK*/
    var success_data = {
      result: 'success',
      socket_id: requested_user
    };
    socket.emit('invite_response', success_data);

    /* Tell the invitee that they have been invited */
    var success_data = {
      result: 'success',
      socket_id: socket.id
    };
    socket.to(requested_user).emit('invited', success_data);

    log('invite succesful');
  });

  /* uninvite_message Command
  /* payload;
  /*  {
  /*    'room': room to join,
  /*    'username': username of person to be invited
  /*    'message': message to send
  /*  }
  /*  uninvite_response:
  /*  {
  /*    'result': 'success'
  /*    'socket_id': the socket_id of the person being uninvited
  /*  }
  /*  or
  /*  {
  /*    'result': 'fail'
  /*    'message': Failure message
  /*  }
  /*  uninvited:
  /*  {
  /*    'result': 'success'
  /*    'socket_id': the socket_id of the person doing the uninviting
  /*  }
  /*  or
  /*  {
  /*    'result': 'fail'
  /*    'message': Failure message
  /*  }
  */
  socket.on('uninvite', function (payload) {
    log('\'uninvite\' with ' + JSON.stringify(payload));
    /* Check to make sure that there's a payload */
    if (('undefined' === typeof payload) || !payload) {
      var error_message = 'uninvite had no payload, command aborted';
      log(error_message);
      socket.emit('uninvite_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }

    /* Check that the message can be traced to a username */
    var username = players[socket.id].username;
    if (('undefined' === typeof username) || !username) {
      var error_message = '\'uninvite\' can\'t identify who sent the message, command aborted';
      log(error_message);
      socket.emit('uninvite_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }

    var requested_user = payload.requested_user;
    if (('undefined' === typeof requested_user) || !requested_user) {
      var error_message = '\'invite\' didn\'t specify a requested_user, command aborted';
      log(error_message);
      socket.emit('invite_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }

    var room = players[socket.id].room;
    var roomObject = io.sockets.adapter.rooms[room];
    /* Make sure the user being invited is in the room */
    if (!roomObject.sockets.hasOwnProperty(requested_user)) {
      var error_message = '\'invite\' requested a user that wasn\'t in the room, command aborted';
      log(error_message);
      socket.emit('invite_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }

    /* If everything is ok respond to the uninviter that everything is OK*/
    var success_data = {
      result: 'success',
      socket_id: requested_user
    };
    socket.emit('uninvite_response', success_data);

    /* Tell the invitee that they have been uninvited */
    var success_data = {
      result: 'success',
      socket_id: socket.id
    };
    socket.to(requested_user).emit('uninvited', success_data);

    log('uninvite succesful');
  });

  /* game_start Command
  /* payload;
  /*  {
  /*    'requested_user': the socket id of the person to play with
  /*  }
  /*  game_start_response:
  /*  {
  /*    'result': 'success'
  /*    'socket_id': the socket_id of the person you are playing with
  /*    'game_id': id of the game session
  /*  }
  /*  or
  /*  {
  /*    'result': 'fail'
  /*    'message': Failure message
  /*  }
  /*
  */
  socket.on('game_start', function (payload) {
    log('\'game_start\' with ' + JSON.stringify(payload));
    /* Check to make sure that there's a payload */
    if (('undefined' === typeof payload) || !payload) {
      var error_message = 'uninvite had no payload, command aborted';
      log(error_message);
      socket.emit('game_start_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }

    /* Check that the message can be traced to a username */
    var username = players[socket.id].username;
    if (('undefined' === typeof username) || !username) {
      var error_message = '\'game_start\' can\'t identify who sent the message, command aborted';
      log(error_message);
      socket.emit('game_start_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }

    var requested_user = payload.requested_user;
    if (('undefined' === typeof requested_user) || !requested_user) {
      var error_message = '\'game_start\' didn\'t specify a requested_user, command aborted';
      log(error_message);
      socket.emit('game_start_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }

    var room = players[socket.id].room;
    var roomObject = io.sockets.adapter.rooms[room];
    /* Make sure the user being invited is in the room */
    if (!roomObject.sockets.hasOwnProperty(requested_user)) {
      var error_message = '\'game_start\' requested a user that wasn\'t in the room, command aborted';
      log(error_message);
      socket.emit('game_start_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }

    /* If everything is ok respond to the game starter that everything is OK*/

    var game_id = Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    var success_data = {
      result: 'success',
      socket_id: requested_user,
      game_id: game_id
    };
    socket.emit('game_start_response', success_data);

    /* Tell the other player to play */
    var success_data = {
      result: 'success',
      socket_id: socket.id,
      game_id: game_id
    };
    socket.to(requested_user).emit('game_start_response', success_data);

    log('game_start succesful');
  });

  /* play_token Command
/* payload;
/*  {
/*    row: 0-7 row to play token on
/*    col: 0-7 col to play token on
/*    color: 'white' or 'black'
/*  }
/*    if successfult a succcess message will be followed by a game_update message
/*  play_token_response:
/*  {
/*    'result': 'success'
/*  }
/*  or
/*  {
/*    'result': 'fail'
/*    'message': Failure message
/*  }
/*
*/
  socket.on('play_token', function (payload) {
    log('\'play_token\' with ' + JSON.stringify(payload));
    /* Check to make sure that there's a payload */
    if (('undefined' === typeof payload) || !payload) {
      var error_message = 'play_token had no payload, command aborted';
      log(error_message);
      socket.emit('play_token_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }
    /* Check that the player has been previously registered */
    var player = players[socket.id];
    if (('undefined' === typeof player) || !player) {
      var error_message = 'server doesn\'t recognize you, try going back one screen';
      log(error_message);
      socket.emit('play_token_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }

    var username = players[socket.id].username;
    if (('undefined' === typeof username) || !username) {
      var error_message = 'play_token cant\'t identify who sent the message';
      log(error_message);
      socket.emit('play_token_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }
    var game_id = players[socket.id].room;
    if (('undefined' === typeof game_id) || !game_id) {
      var error_message = 'play_token cant\'t find your game board';
      log(error_message);
      socket.emit('play_token_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }
    var row = payload.row;
    if (('undefined' === typeof row) || row < 0 || row > 7) {
      var error_message = 'play_token didn\'t specify a valid row. Command aborted';
      log(error_message);
      socket.emit('play_token_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }
    var col = payload.col;
    if (('undefined' === typeof col) || col < 0 || col > 7) {
      var error_message = 'play_token didn\'t specify a valid column. Command aborted';
      log(error_message);
      socket.emit('play_token_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }
    var color = payload.color;
    if (('undefined' === typeof color) || !color || (color != 'white' && color != 'black')) {
      var error_message = 'play_token didn\'t specify a valid color. Command aborted';
      log(error_message);
      socket.emit('play_token_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }
    var game = games[game_id];
    if (('undefined' === typeof game) || !game) {
      var error_message = 'play_token couldn\'t sfind your game board. Command aborted';
      log(error_message);
      socket.emit('play_token_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }

    /** if the current attempt at playing a token is out of turn */
    if(color !== game.whose_turn){
      var error_message = 'play_token message: played out of turn';
      log(error_message);
      socket.emit('play_token_response', {
        result: 'fail',
        message: error_message
      });
      return;
    }

    /** if the wrong socket is playing a color */
    if(
      ((game.whose_turn === 'white') && (game.player_white.socket != socket.id)) ||
      ((game.whose_turn === 'black') && (game.player_black.socket != socket.id))
      ){
      var error_message = 'play_token message: turn played by wrong player';
      log(error_message);
      socket.emit('play_token_response', {
        result: 'fail',
        message: error_message
      });
    }

    /** Send Response */
    var success_data = {
      result: 'success',
    }
    socket.emit('play_token_response', payload);

    /** execute the move */
    if (color == 'white') {
      game.board[row][col] = 'w';
      flip_board('w',row,col,game.board);
      game.whose_turn = 'black';
      game.legal_moves = calculate_valid_moves('b',game.board);
    }
    else if (color == 'black') {
      game.board[row][col] = 'b';
      flip_board('b',row,col,game.board);      
      game.whose_turn = 'white';
      game.legal_moves = calculate_valid_moves('w',game.board);
      
    }
    var d = new Date();
    game.last_move_time = d.getTime();

    send_game_update(socket, game_id, 'played a token');
  });
});

/* Code related to game state */
var games = [];

function create_new_game() {
  var new_game = {};
  new_game.player_white = {};
  new_game.player_black = {};
  new_game.player_white.username = '';
  new_game.player_white.socket = '';
  new_game.player_black.username = '';
  new_game.player_black.socket = '';

  var d = new Date();
  new_game.last_move_time = d.getTime();

  new_game.whose_turn = 'black';

  new_game.board = [
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', 'w', 'b', ' ', ' ', ' '],
    [' ', ' ', ' ', 'b', 'w', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ']
  ];

  new_game.legal_moves = calculate_valid_moves('b',new_game.board);
  console.log('legal moves available '+JSON.stringify(new_game.legal_moves));
  return (new_game);

}
/** check if there is a color 'who' starting at (r,c)  or anywhere further
 * by adding deltaRow and deltaCol to (r,c)
*/
function check_line_match(who,deltaRow,deltaCol,r,c,board){
  if(board[r][c] === who){
    return true;
  }
  if(board[r][c] === ' '){
    return false;
  }
  if( (r+deltaRow < 0) || (r+deltaRow > 7) ){
    return false;
  }
  if( (c+deltaCol < 0) || (c+deltaCol > 7) ){
    return false;
  }
  return check_line_match(who,deltaRow,deltaCol,r+deltaRow,c+deltaCol,board);
}

/** Function to check if a move is valid and return True or False 
 * Check if position at r,c contains the opposite of 'who' 
 * and if line indicated by adding deltaRow to r eventually ends in the who color
*/
function valid_move(who,deltaRow,deltaCol,r,c,board){
  var other;
  if(who === 'b'){
    other = 'w';
  }
  else if(who === 'w'){
    other = 'b';
  }
  else{
    console.log('Houston we have a color problem: '+who);
    return false;
  }

  if((r+deltaRow < 0) || (r+deltaRow > 7)){
    return false;
  }
  if((c+deltaCol < 0) || (c+deltaCol > 7)){
    return false;
  }
  if((r+deltaRow+deltaRow < 0) || (r+deltaRow+deltaRow > 7)){
    return false;
  }
  if((c+deltaCol+deltaCol < 0) || (c+deltaCol+deltaCol > 7)){
    return false;
  }
  if(board[r+deltaRow][c+deltaCol] != other){
    return false;
  }
  return check_line_match(who,deltaRow,deltaCol,r+deltaRow+deltaRow,c+deltaCol+deltaCol,board);
  

}

function calculate_valid_moves(who,board){
  var valid = [
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ']
  ];
  var nw,nn,ne,ee,ww,sw,ss,se;
  for(var row = 0; row < 8; row++){
      for(var col= 0; col < 8; col++){
        if(board[row][col] === ' '){ 
          nw = valid_move(who,-1,-1,row,col,board);
          nn = valid_move(who,-1, 0,row,col,board);
          ne = valid_move(who,-1, 1,row,col,board);

          ee = valid_move(who, 0, 1,row,col,board);
          ww = valid_move(who, 0,-1,row,col,board);

          sw = valid_move(who, 1,-1,row,col,board);
          ss = valid_move(who, 1, 0,row,col,board);
          se = valid_move(who, 1, 1,row,col,board);
          
          if(nw || nn || ne || ee || ww || sw || ss || se){
            valid[row][col] = who;
          }
        }
      }
  }
  return valid;
}

function flip_line(who,deltaRow,deltaCol,row,col,board){
  if((row+deltaRow < 0) || (row+deltaRow > 7)){
    return false;
  }
  if((col+deltaCol < 0) || (col+deltaCol > 7)){
    return false;
  }
  if(board[row+deltaRow][col+deltaCol] === ' '){
    return false;
  }
  if(board[row+deltaRow][col+deltaCol] === who){
    return true;
  }
  else{
    if(flip_line(who,deltaRow,deltaCol,row+deltaRow,col+deltaCol,board)){
      board[row+deltaRow][col+deltaCol]= who;
      return true;
    }
    else{
      return false;
    }
  }
}

function flip_board(who,row,col,board){
  console.log('initiating board flip for player: '+who);
  flip_line(who,-1,-1,row,col,board);
  flip_line(who,-1, 0,row,col,board);
  flip_line(who,-1, 1,row,col,board);

  flip_line(who, 0, 1,row,col,board);
  flip_line(who, 0,-1,row,col,board);

  flip_line(who, 1,-1,row,col,board);
  flip_line(who, 1, 0,row,col,board);
  flip_line(who, 1, 1,row,col,board);
}

function send_game_update(socket, game_id, message) {
  /* Check to see if game_id already exists */
  if (('undefined' === typeof games[game_id]) || !games[game_id]) {
    /** No game exists so make one */
    console.log('No game exists. Creating  ' + game_id + ' for ' + socket.id);
    games[game_id] = create_new_game();
  }
  /* Check if only 2 people are in the game */
  var roomObject;
  var numClients;
  do {
    roomObject = io.sockets.adapter.rooms[game_id];
    numClients = roomObject.length;
    console.log('numClients = ' + numClients)
    if (numClients > 2) {
      console.log('Too many clients in room: ' + game_id + ' #: ' + numClients);
      if (games[game_id].player_white.socket == roomObject.sockets[0]) {
        games[game_id].player_white.socket = '';
        games[game_id].player_white.username = '';
      }
      if (games[game_id].player_black.socket == roomObject.sockets[0]) {
        games[game_id].player_black.socket = '';
        games[game_id].player_black.username = '';
      }
      /* kick one out */
      var sacrifice = object.keys(roomObject.sockets)[0];
      io.of('/').connected[sacrifice].leave(game_id);
    }
  }
  while ((numClients - 1) > 2);
  /* Assign this socket a color */
  /** if the current player isn't assigned a color */
  if ((games[game_id].player_white.socket != socket.id) && (games[game_id].player_black.socket != socket.id)) {
    console.log('the player isns\'t assigned a color: ' + socket.id);
    /** and there isn't a color to give them */
    if ((games[game_id].player_black.socket != '') && (games[game_id].player_white.socket != '')) {
      games[game_id].player_white.socket = '';
      games[game_id].player_white.username = '';
      games[game_id].player_black.socket = '';
      games[game_id].player_black.username = '';
    }
  }
  /** Assign colors to the payers if not already done */
  if (games[game_id].player_white.socket == '') {
    if (games[game_id].player_black.socket != socket.id) {
      games[game_id].player_white.socket = socket.id;
      games[game_id].player_white.username = players[socket.id].username;
      console.log('player white is '+games[game_id].player_white.username)
    }
  }
  if (games[game_id].player_black.socket == '') {
    if (games[game_id].player_white.socket != socket.id) {
      games[game_id].player_black.socket = socket.id;
      games[game_id].player_black.username = players[socket.id].username;
      console.log('player black is '+games[game_id].player_black.username)
    }
  }

  /** send game update */
  var success_data = {
    result: 'success',
    game: games[game_id],
    message: message,
    game_id: game_id
  };
  io.in(game_id).emit('game_update', success_data);
  /** Check to see if game is over */
  var row, col;
  var count = 0;
  var black = 0;
  var white = 0;
  for (row = 0; row < 8; row++) {
    for (col = 0; col < 8; col++) {
      if (games[game_id].legal_moves[row][col] != ' ') {
        count++;
      }
      if (games[game_id].board[row][col] === 'b') {
        black++;
      }
      if (games[game_id].board[row][col] === 'w') {
        white++;
      }
    }
  }
  if(count == 0){
		/*send game over message*/
    var winner = 'tie game';
    if(black > white){
      winner = 'black';
    }
    if(white > black){
      winner = 'white';
    }
		var success_data = {
				result: 'success',
				game: games[game_id],
				who_won: winner,
				game_id: game_id
				};
		io.in(game_id).emit('game_over', success_data);

		/*Delete old games after one hour*/
		setTimeout(function(id){
			return function(){
				delete games[id];			
			}}(game_id)
		,60*60*1000);
	}
}
