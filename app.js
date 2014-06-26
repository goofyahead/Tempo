
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

app.use(favicon());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());

app.post('/register', users.register);
app.post('/confirm', users.confirm);
app.post('/checkUsers', users.registeredInTempo);

app.post('/groups', groups.create);
app.get('/groups', groups.getMyGroups);
app.put('/groups/:group', groups.update);

app.post('/notify/:group', groups.notifyGroup);

app.listen(3000);