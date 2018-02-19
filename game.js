//server
var app = require('express')();
var http = require("http").Server(app);
var io = require("socket.io")(http);
//database
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var url = 'mongodb://localhost:27017/mydb';
// state of game
var game = "";
var joinedGames = [];
var index = 0;

// do this at start so don't have to check later
joinedGames[0] = [];
joinedGames[0].push(Math.ceil(Math.random()* 1000));

http.listen("1000", function () {
    console.log("Connected!");
});

app.get('/game.html', function (req, res) {
    res.sendFile(__dirname + '/game.html');
});

io.on('connection', function (socket) {
    console.log("Someone Connected!");

    socket.on('attack', function (msg) {
        // if they did not join other players
        for (var i = 0; i < games.length; i++) {}

        // set width and bossLvl to their int values
        var w = parseInt(msg.width);
        var b = parseInt(msg.bossLvl);
        // do the attack
        w -= (10 / b);
        // if attack kills boss, get a new more difficult one
        if (w < 1) {
            w = 200;
            b += 1;
        }
        // if they did not join a session just emit to the socket
        if (msg.sessionId == -1) {
            socket.emit('updateHP', {
                "width": w,
                "bossLvl": b
            });
        }
        else {
            // otherwise update hp for all the players in that session
            for (var i = 0; i <= index; i++) {
                if (joinedGames[i][0] == parseInt(msg.sessionId)) {
                    console.log("found a matching session");
                    for (var j = 1; j < joinedGames[i].length; j++) {
                        
                        joinedGames[i][j].emit('updateHP', {
                            'width': w,
                            'bossLvl' : b
                        });
                    }
                }
            }
        }
    }); // end attack

    // Each joined games session can only have 6 players
    // position 0 should be that games sessionId
    function updateIndex() {
        joinedGames.push([]);
        index++;
        joinedGames[index].push(Math.ceil(Math.random()* 1000));
    }

    // player wants to join others
    socket.on('joinQ', function (msg) {
        
        // check and see if the session can have another player
        if (joinedGames[index].length == 7) {
            updateIndex();
        }
        player = {
            'socket' : socket,
            'gameId' : msg.gameId
        }
        // add the player to the session
        joinedGames[index].push(player);
        // update the client with the new session
        socket.emit('joinedSession' , {
            'sessionId' : joinedGames[index][0]
        });
    }); // end joinQ
});