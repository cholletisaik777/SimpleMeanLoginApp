var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var crypto = require('crypto');
var express_jwt = require('express-jwt');
var jwt = require('jsonwebtoken');

mongoose.connect('mongodb://<username>:<password>@ds153392.mlab.com:53392/<name>');

var SimpleLoginSchema = mongoose.Schema({
	name: {type: String, required: true},
	username: {type: String, required: true, unique: true},
	hash: String,
  	salt: String
});

SimpleLoginSchema.methods.setPassword = function(password){
  this.salt = crypto.randomBytes(16).toString('hex');
  this.hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64).toString('hex');
};

SimpleLoginSchema.methods.validPassword = function(password) {
  var hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64).toString('hex');
  return this.hash === hash;
};

SimpleLoginSchema.methods.generateJwt = function() {
  var expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);

  return jwt.sign({
    _id: this._id,
    email: this.email,
    name: this.name,
    exp: parseInt(expiry.getTime() / 1000),
  }, "MY_SECRET"); // DO NOT KEEP YOUR SECRET IN THE CODE!
};

var User = mongoose.model("LoginModel", SimpleLoginSchema);

var app = express();
app.use(express.static(__dirname+'/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));


//configuration

passport.use(new LocalStrategy(
	function(username, password, done) {
		User.findOne({username: username }, function(err, user) {
			if(err) {return done(err); }

			if(!user) {
				return done(null, false, {message: 'Incorrect username.'});
			}

			if(!user.validPassword(password)) {
				return done(null, false, {message: 'Incorrect password.' });
			}

			return done(null, user);

		});
	}
));

app.post('/api/login/', login);

function login(req,res) {
	passport.authenticate('local', function(err, user, info){
	    var token;

	    // If Passport throws/catches an error
	    if (err) {
	      res.status(404).json(err);
	      return;
	    }

	    // If a user is found
	    if(user){
	      token = user.generateJwt();
	      res.status(200);
	      res.json({
	        "token" : token
	      });
	    } else {
	      // If user is not found
	      res.status(401).json(info);
	    }
	})(req, res);
	
};

app.post('/api/register/', register);

function register(req, res) {

  var user = new User();

  user.name = req.body.name;
  user.username = req.body.username;

  user.setPassword(req.body.password);

  user.save(function(err) {
    var token;
    token = user.generateJwt();
    res.status(200);
    res.json({
      "token" : token
    });
  });
};

var auth = express_jwt({
  secret: 'MY_SECRET',
  userProperty: 'payload'
});

app.get('/api/profile/',auth, profileRead);

function profileRead(req, res) {
  if (!req.payload._id) {
    res.status(401).json({
      "message" : "UnauthorizedError: private profile"
    });
  } 
  else {
  	User  
      .findById(req.payload._id)
      .exec(function(err, user) {
        res.status(200).json(user);
      });
  }
};

app.listen(3000);

