var express     = require('express');
var app         = express();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var mongoose    = require('mongoose');
var passport	= require('passport');
var config      = require('./config/database'); // get db config file
var User        = require('./app/models/user'); // get the mongoose model
var port        = process.env.PORT || 8080;
var jwt         = require('jwt-simple');
// Database
var mongo = require('mongodb');
var monk = require('monk');
var db = monk(config.database);
db.options = { 
    safe    : true,
    castIds : false
  };


// get our request parameters
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
 
// log to console
app.use(morgan('dev'));


app.use(function(req,res,next){
    req.db = db;
    next();
});
 
// Use the passport package in our application
app.use(passport.initialize());
 
// connect to database
mongoose.connect(config.database);

// pass passport for configuration
require('./config/passport')(passport);

require('./app/routes/api')(app);





// Start the server
app.listen(port);
console.log('There will be dragons: http://localhost:' + port);