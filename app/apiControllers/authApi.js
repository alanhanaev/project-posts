var express     = require('express');
var passport	= require('passport');
var User        = require('../models/user'); // get the mongoose model
var jwt         = require('jwt-simple');
var config      = require('../../config/database'); // get db config file
// bundle our routes
var apiRoutes = express.Router();

// create a new user account (POST http://localhost:8080/api/signup)
apiRoutes.post('/register', function(req, res) {
 if (!req.body.name || !req.body.password) {
   res.json({success: false, msg: 'Please pass name and password.'});
 } else {
   var newUser = new User({
     name: req.body.name,
     password: req.body.password,
     email: req.body.email
   });
   // save the user
   newUser.save(function(err) {
     if (err) {
       return res.json({success: false, msg: 'Username already exists.'});
     }
     res.json({success: true, msg: 'Successful created new user.'});
   });
 }
});

// route to authenticate a user (POST http://localhost:8080/api/authenticate)
apiRoutes.post('/authenticate', function(req, res) {
    User.findOne({
      name: req.body.name
    }, function(err, user) {
      if (err) throw err;
   
      if (!user) {
        res.send({success: false, msg: 'Authentication failed. User not found.'});
      } else {
        // check if password matches
        user.comparePassword(req.body.password, function (err, isMatch) {
          if (isMatch && !err) {
            // if user is found and password is right create a token
            var token = jwt.encode(user, config.secret);
            // return the information including token as JSON
            res.json({success: true, token: 'JWT ' + token});
          } else {
            res.send({success: false, msg: 'Authentication failed. Wrong password.'});
          }
        });
      }
    });
  });

  // route to a restricted info (GET http://localhost:8080/api/memberinfo)
apiRoutes.get('/memberinfo', passport.authenticate('jwt', { session: false}), function(req, res) {
    var token = getToken(req.headers);
    if (token) {
      var decoded = jwt.decode(token, config.secret);
      User.findOne({
        name: decoded.name
      }, function(err, user) {
          if (err) throw err;
   
          if (!user) {
            return res.status(403).send({success: false, msg: 'Authentication failed. User not found.'});
          } else {
            res.json({success: true, msg: 'Welcome in the member area ' + user.name + '!'});
          }
      });
    } else {
      return res.status(403).send({success: false, msg: 'No token provided.'});
    }
  });
   
  getToken = function (headers) {
    if (headers && headers.authorization) {
      var parted = headers.authorization.split(' ');
      if (parted.length === 2) {
        return parted[1];
      } else {
        return null;
      }
    } else {
      return null;
    }
  };

  module.exports = apiRoutes;