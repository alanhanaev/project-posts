var express = require('express');
var passport = require('passport');
var User = require('../models/user'); // get the mongoose model
var jwt = require('jwt-simple');
var config = require('../../config/database'); // get db config file
// bundle our routes
var apiRoutes = express.Router();

// create a new user account (POST http://localhost:8080/api/signup)
apiRoutes.post('/register', function (req, res) {
  if (!req.body.login || !req.body.password || !req.body.name || !req.body.email) {
    res.json({ success: false, msg: 'Please pass login, password, name, email ' });
  } else {
    var newUser = new User({
      login: req.body.login,
      password: req.body.password,
      name: req.body.name,
      email: req.body.email,
      verifiedEmail: false
    });
    // save the user
    newUser.save(function (err) {
      if (err) {
        return res.json({ success: false, msg: 'Username already exists.' });
      }
      res.json({ success: true, msg: 'Successful created new user.' });
    });
  }
});

// route to authenticate a user (POST http://localhost:8080/api/authenticate)
apiRoutes.post('/authenticate', function (req, res) {
  User.findOne({
    name: req.body.name
  }, function (err, user) {
    if (err) throw err;
    if (!user) {
      res.send({ success: false, msg: 'Authentication failed. User not found.' });
    } else {
      // check if password matches
      user.comparePassword(req.body.password, function (err, isMatch) {
        if (isMatch && !err) {
          // if user is found and password is right create a token
          jwtoken = { login: user.login, expires_in: Date.now() + 2592000000, randomGuid: getGuid() }
          var token = jwt.encode(jwtoken, config.secret); 
          // return the information including token as JSON
          res.json({ success: true, token: 'JWT ' + token });
        } else {
          res.send({ success: false, msg: 'Authentication failed. Wrong password.' });
        }
      });
    }
  });
});

// route to a restricted info (GET http://localhost:8080/api/memberinfo)
apiRoutes.get('/memberinfo', passport.authenticate('jwt', { session: false }), function (req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    User.findOne({
      name: decoded.name
    }, function (err, user) {
      if (err) throw err;

      if (!user) {
        return res.status(403).send({ success: false, msg: 'Authentication failed. User not found.' });
      } else {
        res.json({ success: true, msg: 'Welcome in the member area ' + user.name + '!' });
      }
    });
  } else {
    return res.status(403).send({ success: false, msg: 'No token provided.' });
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
getGuid = function () { // Public Domain/MIT
  var d = new Date().getTime();
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    d += performance.now(); //use high-precision timer if available
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
module.exports = apiRoutes;