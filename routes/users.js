// Twilio Credentials 
var accountSid = 'AC0b488ea0c7b3e3cd4c698077cbf31c64'; 
var authToken = '231599f9c72806e6853b1f514e1e2e1f'; 

//require the Twilio module and create a REST client 
var client = require('twilio')(accountSid, authToken); 

exports.register = function (req, res) {
	console.log(req.body.phone);

	client.messages.create({  
		from: "+14156914520",
		to: req.body.phone,
		body: "your pin is 65050"
	}, function(err, message) { 
		console.log(message.sid); 
	});

	res.send(200);
}

exports.confirm = function (req, res) {
	console.log(req.body.pin);
	res.send(200);
}