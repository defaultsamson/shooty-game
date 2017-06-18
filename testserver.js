var server = require('ws').Server;
var ws = new server({
  port: 9060
});

var clients = [];

ws.on('connection', function(so) {

  clients.push(so);

  so.onmessage = function(message) {
    //var senderIP = socketObject.upgradeReq.connection.remoteAddress;
    //console.log('Message Received (IP: ' + senderIP + ") " + message);

    var json = JSON.parse(message.data);

    if ("type" in json) {
      switch (json.type) {
        case "ping":
          so.send(JSON.stringify({
            type: "pong"
          }));
          console.log("Ping");
          break;
      }
    } else {
      console.log("Error: No \"type\" field found in json object")
    }
  };

  so.on('close', function(c, d) {
    console.log('Disconnect ' + c + ' -- ' + d);
  });
});

console.log('Server started');
