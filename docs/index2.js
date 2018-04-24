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

var user = {
    "username" : "",
    "password" : "",
    "cookie" : "",
    "cart" : [],
    "isLoggedIn" : false,
    "purchases" : []
};
var users = [];

app.use( express.static("public"));

// create instance of server on your localhost machine
http.listen("1000", function () {
    console.log("Connected!");
});

function getUserIndex(cookie) {
    var index = users.length - 1;
    while (index >= 0 && users[index].cookie != cookie) {
        index--;
    }
    console.log("User Index: " + index);
    return index;
}

function getLink(link) {
    var location = "";
    if (link == "profile") {
        location = "http://localhost:1000/newprofile.html";
    }
    if (link == "checkout") {
        location = "http://localhost:1000/checkout.html";
    }
    return location;
}

io.on('connection', function (socket) {

    socket.on("getPriorPurchases" , function(msg) {
        var index = getUserIndex(msg.cookie);

        var query = {username: users[index].username, password: users[index].password};
        var priorPurchases = "";

        MongoClient.connect(url, function(err, db) {
            if (err) {throw err;}

            db.collection("users2").findOne(query, function(err, result) {
                if (err) {throw err;}

                else if (result) {
                    priorPurchases = result.prodID;

                    socket.emit("returnPriorPurchases", {
                        "priorPurchases" : priorPurchases
                    });
                }
            });
        });

    });

    socket.on("purchaseItems", function(msg) {
        var index = getUserIndex(msg.cookie);
        var products = "";


        for (var i = 0; i < users[index].cart.length; i++) {
                products += users[index].cart[i].toString() + ",";
            
        }
        products += msg.priorPurchases;

        var query = {username : users[index].username, password: users[index].password};
        var update = {$set : {prodID : products} };
        MongoClient.connect(url, function(err, db) {
            if (err) {throw err;}

            db.collection("users2").updateOne(query, update, function(err, result) {
                if (err) {throw err;}

                else if (result) {
                    console.log("Purchased Items, added them to users Profile");
                    users[index].cart = [];
                    socket.emit("done", {});
                }
                db.close();
            });
        });
    });

    socket.on("isLoggedIn",function(msg) {
        var logged = false;
        var location = "http://localhost:1000/index4.0.html";
        var index = getUserIndex(msg.cookie);
        if (users[index].isLoggedIn) {
            logged = true;
            location = getLink(msg.link);
        }
        socket.emit("isLoggedInReturn",{
            "isLoggedIn" : logged,
            "location" : location
        });
    });

    socket.on("returningUser", function(msg) {
        var index = getUserIndex(msg.cookie);
        if (index == -1) {
            user.cookie = msg.cookie;
            users.push(user);
            console.log("Cart length (returning user): " + users[users.length - 1].cart.length);
        }
        var newIndex = getUserIndex(msg.cookie);
        socket.emit("notify", {
            "number" : users[newIndex].cart.length
        });

    });

    socket.on("getCookie", function() {
        user.cookie = Math.floor(Math.random() * 10000).toString();
        users.push(user);
        console.log("Cart length (new user): " + users[users.length - 1].cart.length);
        socket.emit("sendCookie", {
            "cookie" : user.cookie
        });
        socket.emit("notify", {
            "number" : users[users.length - 1].cart.length
        });
    });

    socket.on("getCheckout", function(msg) {
        var index = getUserIndex(msg.cookie);
        var cart = users[index].cart;
        var query = {'$or' : []};

            for (var i = 0; i < cart.length; i++) {
                var q = {id : cart[i].toString()};
                query.$or.push(q);
        }

        MongoClient.connect(url, function(err, db) {
            if (err) {throw err;}

            db.collection("products2").find(query).toArray(function(err, result) {
                if (err) {throw err;}

                else if (result) {
                    var prod = {};
                    var products = [];
                    for (var i = 0; i < result.length; i++) {
                        prod = {
                            "name" : result[i].name,
                            "price" : result[i].price
                        };
                        console.log("Product Name: " + result[i].name);
                        products.push(prod);
                    }
                    socket.emit("receiveCheckout", products);
                }
            });
        });
    });

    function productQuery(msg, socket) {
        console.log("Querying: " + msg.name);
        
                MongoClient.connect(url, function(err, db) {
                    if (err) throw err;
        
                    var query = { name: msg.name };
        
                    db.collection("products2").find(query).toArray( function(err, res) {
                        if (err) throw err;
        
                        else if(res) {
                            var prod = {};
                            var products = [];
                            
                            for (var i = 0; i < res.length; i++) {
                                prod = {
                                    "name" : res[i].name,
                                    "price": res[i].price,
                                    "review": res[i].dispRev,
                                    "reviewer": res[i].reviewer,
                                    "id" : res[i].id
                                };
                                products.push(prod);
                            }
                            socket.emit('showProd', products);
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
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;

            var query = {name : msg.name,
                desc    : msg.desc,
                rating  : msg.rating,
                dispRev : msg.dispRev,
                totRev  : msg.totRev,
                price   : msg.price,
                id      : msg.id,
                numSold : msg.numSold,
                reviewer: msg.reviewer};

                db.collection("products2").insertOne(query, function (err, res) {
                    if (err) throw err;

                    else if (res) {
                        socket.emit('goodLogin', {});
                    }
                    db.close();
                });
        });
    }); // end socket addProd

    socket.on('addUser', function(msg) {
        var prodPurchases = "";
       
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;

            var query = { username: msg.username, password: msg.password, fName: msg.fName, lName: msg.lName, address: msg.address, phoneNum: msg.phoneNum, prodID: msg.prodID };

            db.collection("users2").findOne({"username": msg.username, "password" : msg.password}, function(err, result) {
                if (err) {throw err;}
                else if (result) {
                    if (result.prodID != "") {prodPurchases = result.prodID;}
                }
            })
            query.prodID += "," + prodPurchases;
            // insert the new user and store their information
            db.collection("users2").insertOne(query, function (err, result) {
                if (err) {
                    throw err;
                }
                else if (result) {
                    
                    if (msg.cookie == "") {
                        user.cookie = Math.floor(Math.random() * 10000).toString();
                        user.isLoggedIn = true;
                        user.username = msg.username;
                        user.password = msg.password;
                        users.push(user);
                    }
                    else {
                        var index = getUserIndex(msg.cookie);
                        if (index == -1) {
                            user.cookie = msg.cookie;
                            user.isLoggedIn = true;
                            user.username = msg.username;
                            user.password = msg.password;
                            users.push(user);
                        }
                        else {
                            users[index].isLoggedIn = true;
                            users[index].username = msg.username;
                            users[index].password = msg.password;
                        }
                    }                
                    
                    socket.emit('goodLogin', {});
                }
                db.close();
            });
        });
    }); //end socket addUser

 

    socket.on('login', function (msg) {
        console.log("Username: " + msg.username);
        console.log("Password: " + msg.password);

        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            // query the database and store the results
            var query = { username: msg.username, password: msg.password };

            db.collection("users2").findOne(query, function (err, result) {
                if (err) {
                    throw err;
                }
                // a user logged in
                else if (result) {

                    var index = getUserIndex(msg.cookie);

                    if (index == -1) {
                        user.isLoggedIn = true;
                        user.username = msg.username;
                        user.password = msg.password;
                        user.cookie = msg.cookie;
                        users.push(user);
                    }
                    else {
                        users[index].isLoggedIn = true;
                        users[index].username = msg.username;
                        users[index].password = msg.password;
                    }
                    
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

    socket.on("getProfile", function(msg) {
        var index = getUserIndex(msg.cookie);
        var query = { username: users[index].username, password: users[index].password };

        var profile = {
            "fName" : "",
            "lName" : "",
            "address" : "",
            "phoneNum" : "",
            "prodID" : [""]
        };

        MongoClient.connect(url, function(err,db) {
            if(err){throw err;}

            db.collection("users2").findOne(query, function(err,result) {
                if (err) {throw err;}

                else if (result) {
                    profile.fName = result.fName;
                    profile.lName = result.lName;
                    profile.address = result.address;
                    profile.phoneNum = result.phoneNum;
                    profile.prodID = result.prodID;

                    socket.emit("receiveProfile", profile);
                }
                db.close();
            });
        });
    });

    socket.on("getProducts", function(msg) {
        
            var query = {"id" : msg.id};

            MongoClient.connect(url, function(err, db) {
                if (err) {throw err;}

                db.collection("products2").findOne(query, function(err, result) {
                    if (err) {throw err;}
                    
                    else if (result) {
                        console.log("Adding: " + result.name);
                        socket.emit("receiveProduct", {
                            "product" : result.name,
                            "id" : result.id
                        
                        });
                    }
                    db.close();
                });
                
            });
    });

    socket.on("submitReview", function(msg) {
        var index = getUserIndex(msg.cookie);
        var query = {id: msg.id.toString()};
        var update = {$set : {dispRev : msg.review.toString(), reviewer : users[index].username.toString()}};

        MongoClient.connect(url, function(err, db) {
            if (err) {throw err;}

            db.collection("products2").updateOne(query, update, function(err, result) {
                if (err) {throw err;}
                
                else if (result) {
                    console.log("result: " + result);
                    console.log("Product: " + result.name);
                    console.log("changed to: " + result.dispRev);
                    socket.emit("reviewSubmitted", {});
                }
                db.close();
            });
        });
    });

    socket.on("addToCart", function(msg) {
        var index = getUserIndex(msg.cookie);
        users[index].cart.push(msg.id);
        console.log("adding product " + msg.id);
        socket.emit("notify", {
            "number" : users[index].cart.length
        });
    });


});

