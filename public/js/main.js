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
  username = 'Anonymous_'+math.random();
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
	console.log('here');
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
  var newHTML = '<p>'+payload.username+' just entered the lobby. </p>';
  var newNode = $(newHTML);
  newNode.hide();
  $('#messages').append(newNode);
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
  var newHTML = '<p>'+payload.username+' has left the lobby. </p>';
  var newNode = $(newHTML);
  newNode.hide();
  $('#messages').append (newNode);
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
  window.location.href = 'game.html?user='+username+'&game_id='+payload.game_id;

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
	$('#messages').append(newNode);
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

/* Generate the invited button */
function makePlayButton(){
  var newHTML = '<button type=\'button\' class=\'btn btn-alert\'>Play</button>';
  var newNode = $(newHTML);
  return(newNode);
  newNode.click(function(){
    game_start(socket_id);
  });
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
});
