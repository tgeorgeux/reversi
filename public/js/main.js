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

var chat_room = 'game_id';
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
  if (payload.socket_io == socket.id){
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
    var buttonC = makeInviteButton();
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
    var buttonC = makeInviteButton();
    $('socket_'+payload.socket_id+' button').replaceWith(buttonC);
    dom_elements.slideDown(1000);
  }

  var newHTML = '<p>' +payload.username+ ' just entered the lobby. </p> ';
  var newNode = $(newHTML);
  newNode.hide();
  $('#messages').append (newNode);
  newNode.slideDown(1000);
});

/* What to do when the server responds that the someone left a room */
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
  /* If we don't already have an entry for this person */
  if (dom_elements.length != 0){
    $('dom_elements').slideUp(1000);
  }

  /* Manage the message that a player has left the lobby */
  var newHTML = '<p>' +payload.username+ ' has left the lobby. </p> ';
  var newNode = $(newHTML);
  newNode.hide();
  $('#messages').append (newNode);
  newNode.slideDown(1000);
});


socket.on('send_message_response',function(payload){
	console.log('here');
	if (payload.result == 'fail'){
		alert(payload.message);
		return;
	}
	$('#messages').append('<p><b>'+payload.username+' says:</b> '+payload.message+'</p>');
});

function send_message() {
    var payload = {};
    payload.room = chat_room;
    payload.username = username;
    payload.message = $('#send_message_holder').val();
    console.log('*** Client Log Message: \'send_message\' payload: ' + JSON.stringify(payload));
    socket.emit('send_message', payload);
    $('#send_message_holder').val('');
};

/* Generate the invite button */
function makeInviteButton(){
  var newHTML = '<button type=\'button\' class=\'btn btn-outline-primary\'>Invite</button>';
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
