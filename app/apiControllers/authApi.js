var express = require('express');
var passport = require('passport');
var User = require('../models/user'); // get the mongoose model
var jwt = require('jwt-simple');
var config = require('../../config/database'); // get db config file
// bundle our routes
var apiRoutes = express.Router();
var MongoClient = require('mongodb').MongoClient;
var nodemailer = require('nodemailer');
var transport = nodemailer.createTransport({
  host: 'smtp.mail.ru',
  port: 465,
  auth: {
    user: 'alanhanaev',
    pass: '19931802kranhan'
  }
});
var bcrypt = require('bcrypt');



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

  apiRoutes.post('/restore', function (req, res) {
    if (req.body.login || req.body.email) {
      var db = req.db;
      var users = db.get('users');
      if (req.body.email) {
        users.findOne({ email: req.body.email }, function (err, user) {
          if (err) {
            return res.json({ success: false, msg: 'Not found login or username' });
          }
          if (user) {
            transport.sendMail({
              from: 'alanhanaev@mail.ru',
              to: user.email,
              subject: 'Please confirm your e-mail address',
              html: 'Retore token ' + createRestoreToken(user.login)
            }, function (err, reply) {
              if (err) {
                return res.json({ success: false, msg: err.message });
              }
              if (reply) {
                return res.json({ success: true, msg: 'Letter for the restore password has been to your email' });
              }
            });
          }
          else {
            return res.json({ success: false, msg: 'Not found login or username' });
          }
        })
      }
      else {
        if (req.body.login) {
          users.findOne({ login: req.body.login }, function (err, user) {
            if (err) {
              return res.json({ success: false, msg: 'Not found login or username' });
            }
            if (user) {
              transport.sendMail({
                from: 'alanhanaev@mail.ru',
                to: user.email,
                subject: 'Please confirm your e-mail address',
                html: 'Retore token ' + createRestoreToken(user.login)
              }, function (err, reply) {
                if (err) {
                  return res.json({ success: false, msg: err.message });
                }
                if (reply) {
                  return res.json({ success: true, msg: 'Letter for the restore password has been to your email' });
                }
              });
            }
            else {
              return res.json({ success: false, msg: 'Not found login or username' });
            }
          })
        }
        else {
          return res.json({ success: false, msg: 'Not found login or username' });
        }
      }
    } else {
      return res.json({ success: false, msg: 'Not found login or username' });
    }
  });

  apiRoutes.post('/restore_new_pass', function (req, res) {
    if (req.body.password && req.body.token) {
      try {
        var tokenObj = jwt.decode(req.body.token, config.secret);
        if (tokenObj.exripred_in_r < Date.now) {
          return res.json({ success: false, msg: 'Token is expired' });
        }
        else {
          var db = req.db;
          var users = db.get('users');
          users.findOne({ login: tokenObj.login_r }, function (err, user) {
            if (err) throw err;
            if (user) {
              var salt = bcrypt.genSaltSync(10);
              var hash = bcrypt.hashSync(req.body.password, salt);
              users.update({ login: req.user.login }, {$set: { password: hash }}, function(err, suc) {
                if (err) {
                  return res.json({ success: false, msg: "Error save new password" });
                }
                if (suc)
                {
                  return res.json({ success: true, msg: "Your password update" });
                }
                else {
                  return res.json({ success: false, msg: "Error save new password" });
                }
              })
            }
            else {
              return res.json({ success: false, msg: "User not found" });
            }
          })
        }
      }
      catch (e) {
        return res.json({ success: false, msg: e.message });
      }
    }
    else {
      return res.json({ success: false, msg: "Your requets not have token and new password" });
    }
  });

  // route to authenticate a user (POST http://localhost:8080/api/authenticate)
  apiRoutes.post('/authenticate', function (req, res) {
    User.findOne({
      login: req.body.login
    }, function (err, user) {
      if (err) throw err;
      if (!user) {
        res.send({ success: false, msg: 'Authentication failed. User not found.' });
      } else {
        // check if password matches
        user.comparePassword(req.body.password, function (err, isMatch) {
          if (isMatch && !err) {
            // if user is found and password is right create a token 
            var date = Date.now();
            jwtoken = { login: user.login, expires_in: date + 2592000000, token_id: getGuid() }
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


  apiRoutes.get('/logout', passport.authenticate('jwt', { session: false }), function (req, res) {
    var token = getToken(req.headers);
    if (token) {
      var decoded = jwt.decode(token, config.secret);
      User.findOne({ login: decoded.login }, function (err, user) {
        if (err) throw err;
        if (!user) {
          return res.status(403).send({ success: false, msg: 'Logout failed, not found user for logout' });
        } else {
          var db = req.db;
          var black_tokens = db.get('black_tokens');
          black_tokens.findOne({ token: token }, function (e, item) {
            if (item) {
              return res.status(403).send({ success: false, msg: "Logout failed, token is invalid" });
            }
            else {
              black_tokens.insert({ token: token, token_id: decoded.token_id }, function (e, docs) {
                if (e)
                  return res.status(403).send({ success: false, msg: e.message });
                if (docs)
                  return res.status(200).send({ success: true, msg: "Logout success" });
              });
            }
          })
        }
      });
    } else {
      return res.status(403).send({ success: false, msg: 'No token provided for the logout.' });
    }
  });

  // route to a restricted info (GET http://localhost:8080/api/memberinfo)
  apiRoutes.get('/memberinfo', passport.authenticate('jwt', { session: false }), function (req, res) {
        if (!req.user) {
          return res.status(403).send({ success: false, msg: 'Authentication failed. User not found.' });
        } else {
          res.json({ success: true, msg: 'Welcome in the member area ' + req.user.name + '!' });
        }
  });


  createRestoreToken = function (login) {
    var obj = { login_r: login, expires_in_r: Date.now() + 86400000, token_id_r: getGuid() };
    return jwt.encode(obj, config.secret);

  }
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