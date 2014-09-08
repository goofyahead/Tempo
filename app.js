
var fs = require('fs');
var express = require('express');
var app = express();
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var favicon = require('static-favicon');
var cors = require('cors');
var colores = require('colors');

//routes
var users = require('./routes/users');
var groups = require('./routes/groups');
var auth = require('./routes/auth');

app.use(favicon());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());

app.post('/register', users.register);
app.post('/confirm', users.confirm);
app.post('/checkUsers', users.registeredInTempo);

app.post('/groups', auth.authorize, groups.create);
app.get('/groups', auth.authorize, groups.getMyGroups);
app.put('/groups/:group', auth.authorize, groups.update);
app.delete('/groups/:group/people', auth.authorize, groups.deleteUsersFromGroup);
app.put('/groups/:group/people', auth.authorize, groups.addUsersToGroup);

app.post('/notify/:group', auth.authorize, groups.notifyGroup);

app.listen(3000);