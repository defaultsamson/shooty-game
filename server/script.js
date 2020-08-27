var express = require('express')
var https = require('https')
var fs = require('fs')
var WebSocket = require('ws')

// This line is from the Node.js HTTPS documentation.
var options = {
    key: fs.readFileSync('/ssl/private.key'),
    cert: fs.readFileSync('/ssl/public.crt')
}

// Create a service (the app object is just a callback).
var app = express()

// Create an HTTPS service 
var httpsServer = https.createServer(options, app).listen(9060)

var wss = new WebSocket.Server({
    server: httpsServer
})

const idLength = 6
const idChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

const MAX_RANDOM_PLAYERS = 20 // The most players allowed in a randomly created game

var games = []
var clients = []

// Returns the number of players in a given game
function playersInGame(gameID) {
    let num = 0

    for (let i in clients) {
        if (clients[i].gameID == gameID) num++
    }

    return num
}

// Gets a game that was created by randomly joining. returns gameID
function getRandomGame() {

    let foundGame = false

    for (let i in games) {
        let game = games[i]
        if (game.isRandom) {
            let numPlayers = playersInGame(game.gameID)
            if (numPlayers < MAX_RANDOM_PLAYERS) {
                if (foundGame && foundGame.numPlayers >= numPlayers) {
                    // Do nothing, only set a new foundGame if a game is found with more players
                } else {
                    foundGame = { numPlayers: numPlayers, gameID: game.gameID }
                }
            }
        }
    }

    if (foundGame) return foundGame.gameID
    // If we couldn't find a viable game, create a new one
    else return createGame(true)
}

// returns the gameID
function createGame(random) {
	var id = generateSafeID()
        
        games.push({
            gameID: id,
            isRandom: random,
            isInGame: false,
            hasShot: false
        })
        
        console.log("Creating game with ID: " + id)
        
        return id
}

wss.on('connection', function (so) {

    clients.push({
        socket: so,
        username: "Guest",
        gameID: "",
        isHosting: false,
        hasCheckedIn: false,
        time: -1
    })
    //console.log('Connection opened ' + so)

    so.onmessage = function (message) {
        try {
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

                            if (json.isHosting) {
                                // Create room
                                clientEntry.gameID = createGame(false)

                            } else if (json.isRandom) {
                            	clientEntry.gameID = getRandomGame()
                            	// If the client is hosting the game, then we can assume they've been added first
                            	clientEntry.isHosting = playersInGame(clientEntry.gameID) <= 1
                            } else {
                                // Join room
                                // If the key is valid, allow them to try and join a game
                                var id = json.gameID.toUpperCase()
                                if (/^([A-Z0-9]{6})$/.test(id)) {
                                    clientEntry.gameID = id
                                } else {
                                    // Otherwise close the connection because they're hacking
                                    so.send(JSON.stringify({
                                        type: "error",
                                        message: "Trying to crash me, are you?"
                                    }))
                                    so.close()
                                    return
                                }
                            }

                            //  After setting up the gameID...
                            if (gameExists(clientEntry.gameID)) {
                                clientEntry.hasCheckedIn = true

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
                                return
                            }
                        } else {
                            // Otherwise close the connection because they're hacking their name
                            so.send(JSON.stringify({
                                type: "error",
                                message: "Nice try, but that's not an acceptable name"
                            }))
                            so.close()
                            return
                        }
                        break

                    case "start":
                        var clientEntry = clientEntryFromSocket(so)
                        if (clientEntry.isHosting) {
                            startGame(clientEntry.gameID)
                        } else {
                            so.send(JSON.stringify({
                                type: "error",
                                message: "You aren't the host, you're a naughty little hacker"
                            }))
                            so.close()
                            return
                        }
                        break

                    case "sh":
                        var clientEntry = clientEntryFromSocket(so)
                        if (clientEntry.hasCheckedIn && clientEntry.time < 0) {
                            clientEntry.time = json.time
                        }
                        break
                }
            } else {
                console.log("Error: No \"type\" field found in json object")
            }
        } catch (err) {}
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

// The maximum game time that players are allowed to shoot in
const maxShootTime = 1500;
// The max time it'll take to display "SHOOT"
const maxGameDelay = 6000;

function getShootDelay(minimum) {
    function randomNumberFromRange(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
    return randomNumberFromRange(minimum, minimum + maxGameDelay)
}

function startGame(id) {
    console.log("Starting game: " + id)

    var game
    for (var i = 0; i < games.length; i++) {
        if (games[i].gameID === id) {
            game = games[i]
            game.isInGame = true
            break
        }
    }

    var players = []

    // Goes through all clients
    for (var j = 0; j < clients.length; j++) {
        // If there's a player in the game
        if (clients[j].gameID === id) {
            // Tell them that the game is starting
            players.push(clients[j])
            try {
                clients[j].socket.send(JSON.stringify({
                    type: "start"
                }))
            } catch (err) {}
        }
    }

    function shoot() {
        function postShoot() {
            game.isInGame = false
            game.hasShot = false

            var playerNames = []
            var playerTimes = []

            // Goes through all clients
            for (var i = 0; i < players.length; i++) {
                // if the player got a time less than zero, do not include them on the scoreboard
                if (players[i].time > 0) {
                    // If there's no players in the list, just push it
                    var placed = false
                    // Otherwise go through the list of players and
                    for (var j = 0; j < playerTimes.length; j++) {
                        // insert the player in the index of the first player found with a greater time
                        if (players[i].time < playerTimes[j]) {
                            playerNames.splice(j, 0, players[i].username)
                            playerTimes.splice(j, 0, players[i].time)
                            placed = true
                            break
                        }
                    }

                    if (!placed) {
                        playerNames.push(players[i].username)
                        playerTimes.push(players[i].time)
                    }
                }

                // Resets the player's time for the next game
                players[i].time = -1
            }

            // Goes through all clients
            for (var j = 0; j < players.length; j++) {
                try {
                    players[j].socket.send(JSON.stringify({
                        type: "scoreboard",
                        names: playerNames,
                        times: playerTimes
                    }))
                } catch (err) {}
            }
        }

        game.hasShot = true

        // Goes through all clients
        for (var j = 0; j < players.length; j++) {
            try {
                players[j].socket.send(JSON.stringify({
                    type: "sh"
                }))
            } catch (err) {}

        }

        setTimeout(postShoot, maxShootTime)
    }
    setTimeout(shoot, getShootDelay(1200 + 2000 + 2000))
}

function assignNewHost(id) {
    // Goes through all clients
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
