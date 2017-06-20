const idLength = 6
const idChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

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
    gameID: "",
    isHosting: false,
    hasCheckedIn: false
  })
  //console.log('Connection opened ' + so)

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
              var id = generateSafeID()
              clientEntry.gameID = id
              games.push({
                gameID: id,
                isInGame: false
              })

              console.log("Creating game with ID: " + id)
            } else {
              // Join room
              // If the key is valid, allow them to try and join a game
              var id = json.gameID.toUpperCase()
              if (/^([A-Z0-9]{6})$/.test(id)) {
                clientEntry.gameID = id
              } else {
                // Otherwise close the connection because they're hacking
                so.close()
                return
              }
            }

            if (gameExists(clientEntry.gameID)) {
              so.send(JSON.stringify({
                type: "lobby",
                username: clientEntry.username,
                gameID: clientEntry.gameID,
                isHosting: clientEntry.isHosting
              }))

              updatePlayerList(clientEntry.gameID);
            } else {
              so.send(JSON.stringify({
                type: "error",
                message: "No game with ID (" + clientEntry.gameID + ")"
              }))
              so.close()
            }
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
    // Gets the game ID
    var id = clientEntryFromSocket(so).gameID
    var host = clientEntryFromSocket(so).isHosting
    // Removes the socket entry
    removeSocketObjectFromClientList(so)
    // If the player who left was the host, assign a new host
    if (host) {
      assignNewHost(id)
    }
    // Then cleans up
    updatePlayerList(id)
    cleanGames()
  }
})

console.log('Server started');

function assignNewHost(id) {
  // Check all the games and see if there's any players in it
  for (var j = 0; j < clients.length; j++) {
    // If there's a player in the game
    if (clients[j].gameID === id) {
      // Assign them to be the new host
      clients[j].isHosting = true
      clients[j].socket.send(JSON.stringify({
        type: "host"
      }))
      break
    }
  }
}

function updatePlayerList(gameID) {
  var playerSockets = []
  var playerNames = []
  // For each client
  for (var i = 0; i < clients.length; i++) {
    // If the client is in this game
    if (clients[i].gameID === gameID) {
      // If they're the host, add them to the beginning of the array
      if (clients[i].isHosting) {
        playerNames.unshift(clients[i].username)
        // Else add them to the end
      } else {
        playerNames.push(clients[i].username)
      }

      // Adds the client's socket for ease of sending the information later
      playerSockets.push(clients[i].socket)
    }
  }

  // For each client
  for (var i = 0; i < playerSockets.length; i++) {
    playerSockets[i].send(JSON.stringify({
      type: "playerlist",
      list: playerNames
    }))
  }
}

function cleanGames() {
  for (var i = 0; i < games.length; i++) {
    var hasPlayers = false
    var id = games[i].gameID
    // Check all the games and see if there's any players in it
    for (var j = 0; j < clients.length; j++) {
      if (clients[j].gameID === id) {
        hasPlayers = true
        break
      }
    }

    // If there's no players in a game, remove it from the list
    if (!hasPlayers) {
      console.log("Removing game with ID: " + id)
      games.splice(i, 1)
    }
  }
}

function gameExists(id) {
  for (var i = 0; i < games.length; i++) {
    if (games[i].gameID === id) {
      return true
    }
  }
  return false
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

// Generates an ID that no other game currently has
function generateSafeID() {
  var id
  while (true) {
    var badID = false
    id = generateID()
    for (var i = 0; i < games.length; i++) {
      if (games[i].gameID === id) {
        badID = true
        break
      }
    }
    if (!badID) {
      return id
    }
  }
}

// Generates a random game ID
function generateID() {
  var id = ""
  for (var i = 0; i < idLength; i++) {
    id += idChars.charAt(Math.floor(Math.random() * idChars.length));
  }
  return id
}