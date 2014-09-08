var redis = require("redis"),
redisClient = redis.createClient();

exports.authorize = function (req, res, next) {
	var phone = req.header('phone');
	var pin = req.header('pin');

	redisClient.get('user_' + phone, function (err, item) {
		userObj = JSON.parse(item);

		if (userObj.session == pin) next();
		else res.send(403);
	});
}