var express = require('express');
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var path = require('path');
//database
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var url = 'mongodb://localhost:27017/OnShopTest1';

app.use( express.static("public"));

// create instance of server on your localhost machine
http.listen("1000", function () {
    console.log("Connected!");
});

io.on('connection', function (socket) {

    function productQuery(msg, socket) {
        console.log("Querying: " + msg.name);
        
                MongoClient.connect(url, function(err, db) {
                    if (err) throw err;
        
                    var query = { name: msg.name };
        
                    db.collection("products").find(query).toArray( function(err, res) {
                        if (err) throw err;
        
                        else if(res) {
                            console.log(res);
                            var prod = {};
                            var products = [];
                            
                            for (var i = 0; i < res.length; i++) {
                                prod = {
                                    "name" : res[i].name,
                                    "price": res[i].price
                                };
                                products.push(prod);
                            }
                            for (var i = 0; i < products.length; i++) {
                                console.log("Name: " + products[i].name);
                                console.log("Price: " + products[i].price);
                            }
                            socket.emit('showProd', products);
                            //socket.emit('showProd', {
                            //    "name" : msg.name,
                            //    "price" : res.price
                            //});
                        }
                    });
        
        
                });

    }

    console.log("Someone connected!");   

    socket.on("defaultProducts", function() {
        var msg = {
            "name" : "Dart Board"
        };
        productQuery(msg, socket);

    })
    socket.on("clientSendChat", function(msg) {
        console.log("Recieved: " + msg.chat);
        
        socket.emit("serverSendChat", {
            "client": "You: " + msg.chat,
            "server": "Rep: Message received, a representative will be with you shortly"
        });
    });

    socket.on("qDB", function (msg) {
        productQuery(msg, socket);    

        
    });

    socket.on('addProd', function(msg) {
        console.log("I am here")
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;

            var query = {name : msg.name,
                desc    : msg.desc,
                rating  : msg.rating,
                dispRev : msg.dispRev,
                totRev  : msg.totRev,
                price   : msg.price,
                id      : msg.id,
                numSold : msg.numSold};

                db.collection("products").insertOne(query, function (err, res) {
                    if (err) throw err;

                    else if (res) {
                        console.log("Added:\n");
                        console.log("Name: " + msg.name);
                        socket.emit('goodLogin', {});
                    }
                    db.close();
                });
        });
    }); // end socket addProd

    socket.on('register', function (msg) {
        console.log("Attempt Inserting: \n" + "username: " + msg.username + " Password: " + msg.password);
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;

            var query = { username: msg.username, password: msg.password, fName: msg.fName, lName: msg.lName, address: msg.address, phoneNum: msg.phoneNum };

            // insert the new user and store their information
            db.collection("users").insertOne(query, function (err, result) {
                if (err) {
                    throw err;
                }
                else if (result) {
                    console.log("Actual Inserting: \n" + "username: " + msg.username + " Password: " + msg.password);
                    // update the users variables in session
                    var index = session.length - 1;
                    var temp = parseInt(msg.sessionId);
                    while (session[index].sessionId != temp) {
                        index--;
                    }
                    session[index].username = msg.username;
                    session[index].password = msg.password;
                    session[index].socket = socket;
                    socket.emit('goodLogin', {});
                }
                db.close();
            });
        });
    }); // end socket register

    socket.on('login', function (msg) {
        console.log("Username: " + msg.username);
        console.log("Password: " + msg.password);

        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            // query the database and store the results
            var query = { username: msg.username, password: msg.password };

            db.collection("users").findOne(query, function (err, result) {
                if (err) {
                    throw err;
                }
                // a user logged in
                else if (result) {
                    socket.emit('goodLogin', {});
                }
                // incorrect matching username and password
                if (!result) {
                    socket.emit('badLogin', {});
                }
                db.close();
            });
        });
    }); // end socket login



});

