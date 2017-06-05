/* Functions for general use */

/* This function returns the value associated with whichParam on the url */
function getURLParameters(whichParam)
{
  var pageURL = window.location.search.substring(1);
  var pageURLVariables = pageURL.split('&');
  for(var i =0; i < pageURLVariables.length; i++){
    var parameterName = pageURLVariables[i].split('=');
    if(parameterName[0] == whichParam){
      return parameterName[1];
    }
  }
}

var username = getURLParameters('username');
if('undefined' == typeof username || !username) {
  username = 'Anonymous_'+Math.random();
}
var chat_room = getURLParameters('game_id');
if('undefined' == typeof chat_room || !chat_room){
  chat_room = 'lobby';
}

/* Connect to server.js to socket.io */
var socket = io.connect();

/* What to do when the server sends me a log message */
socket.on('log',function(array){
  console.log.apply(console,array);
});

/* What to do when the server responds that the someone joined the room */
socket.on('join_room_response',function(payload){
	/* console.log('here'); */
	if (payload.result == 'fail'){
		alert(payload.message);
		return;
	}

  /* If we are being notified that we joined the room, ignore it */
  if (payload.socket_id == socket.id){
    return;
  }

  /* If someone joined the room, add a new row to the lobby table */
  var dom_elements = $('.socket_'+payload.socket_id);

  /* If we don't already have an entry for this person */
  if (dom_elements.length == 0){
    var nodeA = $('<div></div>');
    nodeA.addClass('socket_'+payload.socket_id);

    var nodeB = $('<div></div>');
    nodeB.addClass('socket_'+payload.socket_id);

    var nodeC = $('<div></div>');
    nodeC.addClass('socket_'+payload.socket_id);

    nodeA.addClass('w-100');

    nodeB.addClass('col-9 text-right');
    nodeB.append('<h4>'+payload.username+'</h4>');

    nodeC.addClass('col-3 text-left');
    var buttonC = makeInviteButton(payload.socket_id);
    nodeC.append(buttonC);

    nodeA.hide();
    nodeB.hide();
    nodeC.hide();
    $('#players').append(nodeA,nodeB,nodeC);
    nodeA.slideDown(1000);
    nodeB.slideDown(1000);
    nodeC.slideDown(1000);
  }
  else{
    uninvite(payload.socket_id);
    var buttonC = makeInviteButton(payload.socket_id);
    $('.socket_'+payload.socket_id+' button').replaceWith(buttonC);
    dom_elements.slideDown(1000);
  }

  /* Manage the message that a new player has joined */
  var newHTML = '<p>'+payload.username+' just entered the room. </p>';
  var newNode = $(newHTML);
  newNode.hide();
  $('#messages').prepend(newNode);
  newNode.slideDown(1000);
});

/* What to do when the server says that the someone left a room */
socket.on('player_disconnected',function(payload){
	console.log('here');
	if (payload.result == 'fail'){
		alert(payload.message);
		return;
	}

  /* If we are being notified that we left the room, ignore it */
  if (payload.socket_io == socket.id){
    return;
  }
  /* If someone left the room, animate out all their content */
  var dom_elements = $('.socket_'+payload.socket_id);

  /* If something exists  */
  if (dom_elements.length != 0){
    $(dom_elements).slideUp(1000);
  }

  /* Manage the message that a player has left the lobby */
  var newHTML = '<p>'+payload.username+' has left the room. </p>';
  var newNode = $(newHTML);
  newNode.hide();
  $('#messages').prepend(newNode);
  newNode.slideDown(1000);
});

function invite(who){
  var payload = {};
  payload.requested_user = who;

  console.log('*** Client log message: \'invite\' payload: '+JSON.stringify(payload));
  socket.emit('invite',payload);
}

socket.on('invite_response',function(payload){
	if (payload.result == 'fail'){
		alert(payload.message);
		return;
	}
  newNode = makeInvitedButton(payload.socket_id);
  $('.socket_'+payload.socket_id+' button').replaceWith(newNode);
});

/* handle a notification that we have been invited */
socket.on('invited',function(payload){
	if (payload.result == 'fail'){
		alert(payload.message);
		return;
	}
  newNode = makePlayButton(payload.socket_id);
  $('.socket_'+payload.socket_id+' button').replaceWith(newNode);
});

/* Send an uninvite message */
function uninvite(who){
  var payload = {};
  payload.requested_user = who;

  console.log('*** Client log message: \'uninvite\' payload: '+JSON.stringify(payload));
  socket.emit('uninvite',payload);
}

socket.on('uninvite_response',function(payload){
	if (payload.result == 'fail'){
		alert(payload.message);
		return;
	}
  newNode = makeInviteButton(payload.socket_id);
  $('.socket_'+payload.socket_id+' button').replaceWith(newNode);
});

/* Send game_start message to server */
function game_start(who){
  console.log('game attempting to start');
  var payload = {};
  payload.requested_user = who;
  console.log('*** Client log message: \'game_start\' payload: '+JSON.stringify(payload));
  socket.emit('game_start',payload);
}

/* handle notification that we have been engaged */
socket.on('game_start_response',function(payload){
	if (payload.result == 'fail'){
		alert(payload.message);
		return;
	}
  newNode = makeEngagedButton(payload.socket_id);
  $('.socket_'+payload.socket_id+' button').replaceWith(newNode);

  /* Jump to a new page */
  window.location.href = 'game.html?username='+username+'&game_id='+payload.game_id;

});

socket.on('uninvited',function(payload){
	if (payload.result == 'fail'){
		alert(payload.message);
		return;
	}
  newNode = makeInviteButton(payload.socket_id);
  $('.socket_'+payload.socket_id+' button').replaceWith(newNode);
});

function send_message() {
    var payload = {};
    payload.room = chat_room;
    payload.message = $('#send_message_holder').val();
    console.log('*** Client Log Message: \'send_message\' payload: ' + JSON.stringify(payload));
    socket.emit('send_message', payload);
    $('#send_message_holder').val('');
};



socket.on('send_message_response',function(payload){
	console.log('here');
	if (payload.result == 'fail'){
		alert(payload.message);
		return;
	}

  var newHTML = '<p><b>'+payload.username+' says:</b> '+payload.message+'</p>';
  var newNode = $(newHTML);
  newNode.hide()
	$('#messages').prepend(newNode);
  newNode.slideDown(1000);

});

/* Generate the invite button */
function makeInviteButton(socket_id){
  var newHTML = '<button type=\'button\' class=\'btn btn-outline-primary\'>Invite</button>';
  var newNode = $(newHTML);
  newNode.click(function(){
    invite(socket_id);
  });
  return(newNode);
}

/* Generate the invited button */
function makeInvitedButton(socket_id){
  var newHTML = '<button type=\'button\' class=\'btn btn-primary\'>Invited</button>';
  var newNode = $(newHTML);
  newNode.click(function(){
    uninvite(socket_id);
  });
  return(newNode);
}

/* Generate the play button */
function makePlayButton(socket_id){
  var newHTML = '<button type=\'button\' class=\'btn btn-alert\'>Play</button>';
  var newNode = $(newHTML);
  newNode.click(function(){
    game_start(socket_id);
  });
  return(newNode);

}

/* Generate the invited button */
function makeEngagedButton(){
  var newHTML = '<button type=\'button\' class=\'btn btn-danger\'>Engaged</button>';
  var newNode = $(newHTML);
  return(newNode);
}

/* Ready-load function */
$(function() {
    var payload = {};
    payload.room = chat_room;
    payload.username = username;

    console.log('*** Client Log Message: \'join room\' payload: ' + JSON.stringify(payload));
    socket.emit('join_room', payload);

    $('#quit').append('<a href="lobby.html?username='+username+'" class="btn btn-danger btn-default active" role="button" aria-pressed="true">Quit</a>');
    
});

var old_board = [
  ['?','?','?','?','?','?','?','?'],
  ['?','?','?','?','?','?','?','?'],
  ['?','?','?','?','?','?','?','?'],
  ['?','?','?','?','?','?','?','?'],
  ['?','?','?','?','?','?','?','?'],
  ['?','?','?','?','?','?','?','?'],
  ['?','?','?','?','?','?','?','?'],
  ['?','?','?','?','?','?','?','?']
];

var my_color =  ' ';

socket.on('game_update',function(payload){

    console.log('*** Client Log Message: \'game_update\' \n\tpayload: ' + JSON.stringify(payload));

    /** Check for a good board update */
    if (payload.result == 'fail'){
      console.log(payload.message);
      window.location.href ='lobby.html?username='+username;
		  alert(payload.message);
		  return;
	  }
    /** Check for good board in payload */
    var board = payload.game.board;
    if(undefined == typeof board || !board){
      console.log('internal error: received a malformed board from the server');
      return;
    }
    /** Update my color */
    if(socket.id == payload.game.player_white.socket){
      my_color = 'white';
    }
    else if(socket.id == payload.game.player_black.socket){
      my_color = 'black';
    }
    else{
      /** Something weird is going on, like 3 players in a room */
      /** send client back to the lobby */
      window.location.href = 'lobby.html?username='+username;
      return;
    }

$('#my_color').html('<h3 id="my_color">I am '+my_color+'</h3>');

    /** Animate changes to the board */
    var blackSum = 0;
    var whiteSum = 0;
    var row,col;
    for(row = 0; row < 8; row++){
      for(col= 0; col < 8; col++){
        if(board[row][col] == 'b'){
          blackSum++;
        }
        if(board[row][col] == 'w'){
          whiteSum++;
        }
        /** if boardspace has changed */
        if(old_board[row][col] != board[row][col]){
          if(old_board[row][col] == '?' && board[row][col] == ' '){
            $('#'+row+'_'+col).html('<img src="assets/images/empty.gif" alt="empty square"/>');
          }
          else if(old_board[row][col] == '?' && board[row][col] == 'w'){
            $('#'+row+'_'+col).html('<img src="assets/images/empty_to_white.gif" alt="white square"/>');
          }
          else if(old_board[row][col] == '?' && board[row][col] == 'b'){
            $('#'+row+'_'+col).html('<img src="assets/images/empty_to_black.gif" alt="black square"/>');  
          }
          else if(old_board[row][col] == ' ' && board[row][col] == 'w'){
            $('#'+row+'_'+col).html('<img src="assets/images/empty_to_white.gif" alt="white square"/>');
          }
          else if(old_board[row][col] == ' ' && board[row][col] == 'b'){
            $('#'+row+'_'+col).html('<img src="assets/images/empty_to_black.gif" alt="white square"/>');
          }
          else if(old_board[row][col] == '?' && board[row][col] == 'b'){
            $('#'+row+'_'+col).html('<img src="assets/images/empty_to_white.gif" alt="black square"/>');  
          }
          else if(old_board[row][col] == 'w' && board[row][col] == ' '){
            $('#'+row+'_'+col).html('<img src="assets/images/white_to_empty.gif" alt="empty square"/>');  
          }
          else if(old_board[row][col] == 'b' && board[row][col] == ' '){
            $('#'+row+'_'+col).html('<img src="assets/images/black_to_empty.gif" alt="empty square"/>');  
          }
          else if(old_board[row][col] == 'w' && board[row][col] == 'b'){
            $('#'+row+'_'+col).html('<img src="assets/images/white_to_black.gif" alt="black square"/>');  
          }
          else if(old_board[row][col] == 'b' && board[row][col] == 'w'){
            $('#'+row+'_'+col).html('<img src="assets/images/black_to_white.gif" alt="white square"/>');  
          }
          else {
            $('#'+row+'_'+col).html('<img src="assets/images/error.gif" alt="error square"/>');              
          }
          /** Set up interactivity */
          $('#'+row+'_'+col).off('click');
          if(board[row][col] == ' '){
            $('#'+row+'_'+col).addClass('hovered_over');
            $('#'+row+'_'+col).click(function(r,c){
              return function(){
                var payload = {};
                payload.row = r;
                payload.col = c;
                payload.color = my_color;
                console.log('***Client Log Message***: \'play_token\' payload: '+JSON.stringify(payload));
                socket.emit('play_token', payload);
              };
            }(row,col)); 
          }
          else{
            $('#'+row+'_'+col).removeClass('hovered_over');         
          }
        }
      }
    }
    $('#black_sum').html(blackSum);
    $('#white_sum').html(whiteSum);

    old_board = board;
});


socket.on('play_token_response',function(payload){

    console.log('*** Client Log Message: \'play_token_response\' \n\tpayload: ' + JSON.stringify(payload));

    /** Check for a good play_token_response */
    if (payload.result == 'fail'){
      console.log(payload.message);
      alert(payload.message);
		  return;
	  }
});

socket.on('game_over',function(payload){

    console.log('*** Client Log Message: \'game_over\' \n\tpayload: ' + JSON.stringify(payload));

    /** Check for a good play_token_response */
    if (payload.result == 'fail'){
      console.log(payload.message);
      alert(payload.message);
		  return;
	  }

    /** Jump to a new page */
    $('#game_over').html('<h1>Game Over</h1><h2> '+payload.who_won+' won!<h2>');
    $('#game_over').append('<a href="lobby.html?username='+username+'" class="btn btn-success btn-lg active" role="button" aria-pressed="true">Return to the lobby</a>');
    
});