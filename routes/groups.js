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
		var protected = req.body.protected || true;
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
			people : peopleArray,
			protected : protected
		};

		console.log('CREATING GROUP: '.green + incr + ' With data ' + JSON.stringify(group) + ' OWNER: ' + me);
		redisClient.setex('groups_' + incr, DEFAULT_TTL, JSON.stringify(group), redis.print);
		redisClient.sadd('my_groups_' + me, incr, redis.print);

		res.send(200);
	});
}

exports.deleteUsersFromGroup = function (req, res) {
	var people = req.body.people;
	var modifiedGroup = req.params.group;
	var me = req.header('phone');

	console.log('DELETING '.yellow + people);
	redisClient.get('groups_' + modifiedGroup, function (err, item){
		var groupObj = JSON.parse(item);

		if (groupObj.owner != me) res.send (403, {message : 'only owners can delete users'});
		var peopleArray = [];
		groupObj.people.forEach(function (person) {
			if (! _.contains(people, person.id)) peopleArray.push(person);
		});
		groupObj.people = peopleArray;
		redisClient.set('groups_' + modifiedGroup, JSON.stringify(groupObj), redis.print);
		res.send(200);
	});
}

exports.addUsersToGroup = function (req, res) {
	var people = req.body.people;
	var modifiedGroup = req.params.group;
	var me = req.header('phone');

	console.log('ASK TO ADD '.yellow + people);

	redisClient.get('groups_' + modifiedGroup, function (err, item){
		var groupObj = JSON.parse(item);

		if (groupObj.protected && groupObj.owner != me) res.send (403, {message : 'only owners can add users'});

		groupObj.people.forEach(function (person) {
			if (_.contains(people, person.id)) people.splice(people.indexOf(person.id), 1);
		});

		console.log('ADDING '.yellow + people);

		people.forEach(function (person) {
			groupObj.people.push({id : person, status : 'pending', eta : '?'});
		});

		redisClient.set('groups_' + modifiedGroup, JSON.stringify(groupObj), redis.print);
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

			if (group.protected && group.owner != me) res.send (403, {message : 'only owners can edit groups'});

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
			} else {
				res.send(403, {message : 'you need to belong to the group to notify it'});
			}
			res.send(200);
		}
	});
}



