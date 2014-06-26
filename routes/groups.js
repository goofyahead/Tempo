var redis = require("redis"),
redisClient = redis.createClient();
var async = require('async');
var DEFAULT_TTL = 30 * 24 * 60 * 60;
var notifications = require('./notifications');
var _ = require("underscore");

exports.create = function (req, res) {
	redisClient.incr('APP_GROUPS_COUNTER', function (err, incr){
		var name = req.body.name;
		var lat = req.body.latitude;
		var long = req.body.longitude;
		var timestamp = req.body.timestamp;
		var imageUrl = req.body.image;
		var ttl = req.body.ttl;
		var people = req.body.people;
		var peopleArray = [];
		var me = req.header('phone');

		people.forEach(function (guy) {
			peopleArray.push({id : guy, status : 'pending', eta : '?'});
		});

		peopleArray.push({id : me, status : 'pending', eta : '?'});

		var group = {
			id : incr,
			name : name,
			lat : lat,
			long : long,
			when : timestamp,
			owner : me,
			image : imageUrl,
			people : peopleArray
		};

		console.log('CREATING GROUP: '.green + incr + ' With data ' + JSON.stringify(group) + ' OWNER: ' + me);
		redisClient.setex('groups_' + incr, DEFAULT_TTL, JSON.stringify(group), redis.print);
		redisClient.sadd('my_groups_' + me, incr, redis.print);

		res.send(200);
	});
}

exports.getMyGroups = function (req, res) {
	var me = req.header('phone');
	var mygroups = [];
	redisClient.smembers('my_groups_' + me, function (err, items){
		async.each(items, function (elem , cb) {
			redisClient.get('groups_' + elem, function (err, item) {
				if (err || !item){
					redisClient.srem('my_groups_' + me, elem);
				} else {
					mygroups.push(JSON.parse(item));
				}
				cb();
			});
		}, function (err){
			res.send(mygroups);
		});
	});
}

exports.update = function (req, res) {
	var newGroupData = req.body;
	var modifiedGroup = req.params.group;
	var me = req.header('phone');

	redisClient.get('groups_' + modifiedGroup, function (err, item){
		if (err || !item){
			res.send(404, {message : 'cannot update unexisting group'});
		} else if (modifiedGroup !== newGroupData.id){
            res.send(404, {message : 'dont mess up the ids'});
		} else {
			var group = JSON.parse(item);
			console.log(JSON.stringify(group));
			console.log(JSON.stringify(newGroupData));
			if (newGroupData.name && newGroupData.id) {
				newGroupData.people = group.people;
				redisClient.setex('groups_' + modifiedGroup, DEFAULT_TTL, JSON.stringify(newGroupData), redis.print);
				res.send(200);
			} else {
				res.send(400, {message: 'you need to update with a name and people array and id'});
			}
		}

	});
}

exports.notifyGroup = function (req, res) {
	var group = req.params.group;
	var me = req.header('phone');
	var ttl = req.body.ttl;
	var idsToNotify = [];

	redisClient.get('groups_' + group, function (err, item){
		if (err || !item){
			res.send(404, {message : 'cannot update unexisting group'});
		} else {
			groupObj = JSON.parse(item);
			var partOf = false;
			groupObj.people.forEach( function (person) {
				if (person.id == me){
					partOf = true;
					person.status = 'going';
					person.eta = ttl;
				} else {
					idsToNotify.push({id: person.id, platform: person.platform});
				}
			});

			if (partOf) {
				// push notification to team members, update group on redis
				redisClient.setex('groups_' + group, DEFAULT_TTL, JSON.stringify(groupObj), redis.print);
			    notifications.notify(idsToNotify, {group: group, who: me, ttl : ttl});
			}
			res.send(200);
		}
	});
}



