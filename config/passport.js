var JwtStrategy = require('passport-jwt').Strategy;

// load up the user model
var User = require('../app/models/user');
var config = require('./database'); // get db config file

// Database
var mongo = require('mongodb');
var monk = require('monk');
var db = monk(config.database);



module.exports = function(passport) {
 var opts = {};
 opts.secretOrKey = config.secret;
 passport.use(new JwtStrategy(opts, function(jwt_payload, done) {
   var black_tokens =  db.get('black_tokens');
   black_tokens.findOne({token_id: jwt_payload.token_id }, function(err, token) {
      if (err) {
       return done(err, false);
      }
      else {
        if (token) {
           return done(null, false);
        }
        else {
            User.findOne({login: jwt_payload.login}, function(err, user) {
                if (err) {
                    return done(err, false);
                }
                var date=Date.now();
                if (jwt_payload.expires_in < date) {
                  return  done(null, false);
                }
                if (user) {
                   return done(null, user);
                } else {
                   return done(null, false);
                }
            });
        }
      }
   })
 }));
};