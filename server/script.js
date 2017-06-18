const idLength = 6
const idChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

var server = require('ws').Server
var ws = new server({
  port: 9060
})

var games = []
var clients = []

ws.on('connection', function (so) {

  clients.push({
    socket: so,
    username: "Guest",
    dank: "memes",
    isHosting: false,
    hasCheckedIn: false
  })
  console.log('Connection opened ' + so)

  so.onmessage = function (message) {
    //var senderIP = so.upgradeReq.connection.remoteAddress;
    //console.log('Message Received (IP: ' + senderIP + ") " + message);

    var json = JSON.parse(message.data)

    // Switch packet types
    if ("type" in json) {
      switch (json.type) {
        case "ping":
          so.send(JSON.stringify({
            type: "pong"
          }))
          console.log("Ping")
          break
        case "login":
          // If the username input is filled out properly
          if (/^([A-Za-z0-9]{3,20})$/.test(json.username)) {
            var clientEntry = clientEntryFromSocket(so)
            clientEntry.username = json.username
            clientEntry.isHosting = json.isHosting
            clientEntry.hasCheckedIn = true

            if (json.isHosting) {
              // Create room
              var id = generateID()
              clientEntry.gameID = id
              games.push({
                id: id
              })

              console.log("Creating game with ID: " + id)
            } else {
              // Join room
              // If the key is valid, allow them to try and join a game
              if (/^([A-Za-z0-9]{6})$/.test(json.gameID)) {
                clientEntry.gameID = json.gameID
              } else {
                // Otherwise close the connection because they're hacking
                so.close()
                return
              }
            }

            so.send(JSON.stringify({
              type: "lobby",
              username: clientEntry.username,
              gameID: clientEntry.gameID,
              isHosting: clientEntry.isHosting
            }))
          } else {
            // Otherwise close the connection because they're hacking
            so.close()
            return
          }
          break

      }
    } else {
      console.log("Error: No \"type\" field found in json object")
    }
  };

  so.onclose = function (c, d) {
    removeSocketObjectFromClientList(so)
    cleanGames()
    console.log('Disconnect ' + c + ' -- ' + d)
  };
})

console.log('Server started');

function cleanGames() {
  for (var i = 0; i < games.length; i++) {
    var hasPlayers = false
    // Check all the games and see if there's any players in it
    for (var i = 0; i < clients.length; i++) {
      if (clients[i].gameID === games[i].gameID) {
        hasPlayers = true
        break
      }
    }
    // If there's no players in a game, remove it from the list
    if (!hasPlayers) {
      games.splice(i, 1)
    }
  }
}

function clientEntryFromSocket(so) {
  for (var i = 0; i < clients.length; i++) {
    if (clients[i].socket === so) {
      return clients[i]
    }
  }
}

function removeSocketObjectFromClientList(so) {
  for (var i = 0; i < clients.length; i++) {
    if (clients[i].socket === so) {
      clients.splice(i, 1)
      return
    }
  }
}

function generateID() {
  var id = ""
  for (var i = 0; i < idLength; i++) {
    id += idChars.charAt(Math.floor(Math.random() * idChars.length));
  }
  return id
}