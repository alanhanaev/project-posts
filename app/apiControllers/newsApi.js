var express = require('express');
var fs = require('fs');
var path = require("path");
var passport = require('passport');
var jwt = require('jwt-simple');
var config = require('../../config/database'); // get db config file
var apiRoutesNews = express.Router();
var bcrypt = require('bcrypt');
var multer = require('multer');
var imagesSaveDist = "./images/";
var storage = multer.diskStorage({
  destination: function (req, file, callback) {
    if (req.user) {
      checkDirecorySync(imagesSaveDist + req.user.login);
      return callback(null, imagesSaveDist + req.user.login);
    }
    else {
      return callback(new Error('User not found'));
    }
  },
  filename: function (req, file, callback) {
    var ext = path.extname(file.originalname);
    return callback(null, Date.now() + ext);
  }
});
var upload = multer({ fileFilter: filefilter, storage: storage }).single('photo');

apiRoutesNews.post('/add', passport.authenticate('jwt', { session: false }), function (req, res, next) {
  if (!req.user) {
    return res.json({ success: false, msg: 'User not found' });
  } else {
    if (req.body.title && req.body.text) {
      var db = req.db;
      var news = db.get('posts_news', {castIds: false});
      var rId=genId(4);
      var dbNews = {_id:rId, newsTitle: req.body.title, newsText: req.body.text, newsDate: Date.now(), posts: { vk: {}, ok: {} }, publicationStatus: 1, userId: req.user.login, photos: [] };
      if (req.body.photos) {
        var photos = JSON.parse(req.body.photos);
        for (var i = 0; i < photos.length; i++) {
          if (fs.existsSync(imagesSaveDist + req.user.login + '/' + photos[i])) {
            dbNews.photos.push(photos[i]);
          }
        }
      }
      news.insert(dbNews, function (e, docs) {
        if (e)
          return res.status(403).send({ success: false, msg: e.message });
        if (docs)
          return res.status(200).send({ success: true, msg: "Add news success" , id: rId});
      })
    }
    else {
      return res.status(403).send({ success: false, msg: 'Not all parameters are specified' });
    }
  }
});

apiRoutesNews.post('/edit', passport.authenticate('jwt', { session: false }), function (req, res, next) {
  if (!req.user) {
    return res.json({ success: false, msg: 'User not found' });
  } else {
    if (req.body.id) {
      var news = req.db.get('posts_news', {castIds: false});
      var dbNews = {};
       if (req.body.title) 
       dbNews['newsTitle']=req.body.title;
       if (req.body.text) 
       dbNews['newsText']=req.body.text;
      if (req.body.photos) {
        var photos = JSON.parse(req.body.photos);
        dbNews.photos=[];
        for (var i = 0; i < photos.length; i++) {
          if (fs.existsSync(imagesSaveDist + req.user.login + '/' + photos[i])) {
            dbNews.photos.push(photos[i]);
          }
        }
      }
      news.update({ _id: req.body.id, userId: req.user.login }, {$set: dbNews}, function (e, docs) {
        if (e)
          return res.status(403).send({ success: false, msg: e.message });
        if (docs)
        {
          if (docs.nModified > 0)
          return res.status(200).send({ success: true, msg: "Update news success"});
          else
          return res.status(403).send({ success: false, msg: "Update failed" });
        }
          
      })
    }
    else {
      return res.status(403).send({ success: false, msg: 'Not have id parameters' });
    }
  }
});

apiRoutesNews.get('/getphoto', function (req, res, next) {
  if (req.query.filename && req.query.userlogin) {
    return res.sendFile(path.resolve(imagesSaveDist + req.query.userlogin + '/' + req.query.filename));
  }
  else
    return res.status(404).send('Not found');
});

apiRoutesNews.post('/uploadphoto', passport.authenticate('jwt', { session: false }), function (req, res, next) {
  if (!req.user) {
    return res.json({ success: false, msg: 'User not found' });
  } else {
    upload(req, res, function (err) {
      if (err) {
        return res.json({ success: false, msg: err.message });
      }
      if (res.req.file)
        return res.json({ success: true, msg: 'Succesfull loaded file', fileName: res.req.file.filename });
      else
        return res.json({ success: false, msg: 'File not found' });
    })
  }
});

function genId(count) {
  var s = 'id' + Date.now();
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < count; i++)
    s += possible.charAt(Math.floor(Math.random() * possible.length));
  return s;
}

function filefilter(req, file, cb) {
  var ext = path.extname(file.originalname);
  if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
    return cb(null, true);
  }
  return cb(new Error('Wrong file extension'));
};
function checkDirecorySync(directory) {
  try {
    fs.statSync(directory);
  }
  catch (e) {
    fs.mkdirSync(directory);
  }
}
function getGuid() { // Public Domain/MIT
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
module.exports = apiRoutesNews;