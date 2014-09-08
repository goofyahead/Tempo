// Twilio Credentials 
var accountSid = 'AC0b488ea0c7b3e3cd4c698077cbf31c64'; 
var authToken = '231599f9c72806e6853b1f514e1e2e1f'; 
var redis = require("redis"),
redisClient = redis.createClient();
var async = require('async');
var crypto = require('crypto');
var _ = require("underscore");
var TTL = 30 * 60;


//require the Twilio module and create a REST client 
var client = require('twilio')(accountSid, authToken); 

exports.register = function (req, res) {
	console.log('registration called for: '.yellow + req.body.phone);

	var phone = req.param('phone');
	var session = crypto.randomBytes(3).toString('hex').toString().toUpperCase();

	redisClient.setex('phone_' + phone, TTL, session, redis.print);
	
	client.messages.create({  
		from: "+14156914520",
		to: req.body.phone,
		body: "your pin is " + session
	}, function(err, message) {
		if (! err) {
			console.log("message sent: ".green + message.sid); 
		}else {
			console.log(error);
		}
	});

	res.send(200);
}

exports.registeredInTempo = function (req, res) {
	var people = req.body.people;

	console.log('checking ' + people);
	async.filter(people, function(person, cb) {
		if (person.lastIndexOf('+') == -1) person = '+34' + person;

		redisClient.get('user_' + person, function (err, item){
			console.log('returning');
			if (!err && item) cb(true);
			else cb(false);
		});
	}, function (results){
		console.log('response');
		res.send(results);
	});

}

exports.confirm = function (req, res) {
	var pin = req.body.pin;
	var phone = req.body.phone;
	var username = req.body.username;
	var platform = req.body.platform;
	var pushId = req.body.push_id;

	var secret = crypto.randomBytes(20).toString('hex').toString().toUpperCase();

	console.log(req.body.pin);
	console.log(req.body.phone);
	console.log(req.body.username);

	redisClient.get('phone_' + phone, function (err, elem){
		if (err) res.send(500);

		if (elem == pin) {
			// create the new user
			var newUser = {
				session : secret,
				username : username,
				platform : platform,
				push_id : pushId
			};

			console.log(newUser);
			redisClient.set('user_' + phone, JSON.stringify(newUser), redis.print);
			redisClient.del('phone_' + phone, redis.print);
			res.send(200, {session : secret});
		} else {
			res.send(403);
		}
	});
}





