
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

app.use(favicon());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());

app.post('/register', users.register);
app.post('/confirm', users.confirm);

app.listen(3000);