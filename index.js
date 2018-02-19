var app = require('express')();
var http = require("http").Server(app);
var io = require("socket.io")(http);
//database
//var MongoClient = require('mongodb').MongoClient;
//var assert = require('assert');
//var ObjectId = require('mongodb').ObjectID;
//var url = 'mongodb://localhost:27017/mydb';

// store users info and what they do here
var session = [];
// store users who connect here, 
//then push them onto the array like this: session.push(user);
var user = {
    "username" : "",
    "password" : "",
    "sessionId": 0,
    "socket" : ""
};

// create instance of server on your localhost machine
http.listen("1000", function () {
    console.log("Connected!");
});

app.get('/index.html', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
    console.log("Someone connected!");



});
