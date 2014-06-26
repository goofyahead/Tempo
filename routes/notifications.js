var gcm = require('node-gcm');
var async = require('async');
var redis = require("redis"),
redisClient = redis.createClient();
var sender = new gcm.Sender('AIzaSyBQyZ69cQ085fVrWiKZDATnL9F4fMTwQjY');

exports.notify = function (peopleToNotify, whatToNotify) {
	var androidIds = [];
	var iosIds = [];

	console.log(peopleToNotify);

	async.each(peopleToNotify, function (elem , cb) {
		redisClient.get('user_' + elem.id, function (err, item){
			console.log(item);
			var itemObj = JSON.parse(item);
			if (item && itemObj.push_id) {
				if (itemObj.platform == 'ios') {

				} else {
					androidIds.push(itemObj.push_id);
				}
			}
			cb();
		});
	}, function (err){
		var message = new gcm.Message({
			collapseKey: 'update',
			delayWhileIdle: true,
			timeToLive: 3,
			data: {
				personId : whatToNotify.who,
				personTtl : whatToNotify.ttl,
				group : whatToNotify.group
			}
		});

		notifyAndroid(androidIds, message);
	});
}

function notifyAndroid (ids, message) {
	sender.send(message, ids, 2, function (err, result) {
		console.log(result);
	});
}