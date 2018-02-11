var express = require('express');
var router = express.Router();
var crypto = require('crypto');
const querystring = require('querystring');

var MY_ENV = require('../env.json');

var CLIENTID = MY_ENV['clientID'];
var CLIENTSECRET = MY_ENV['clientSecret'];
var TOKEN_URL = MY_ENV['tokenHost'];



// Set the configuration settings
const credentials = {
  client: {
    id: CLIENTID,
    secret: CLIENTSECRET
  },
  auth: {
    tokenHost: TOKEN_URL,
    tokenPath: '/token.php',
    authorizePath: '/oauth/authorize.php'
  }
};

// Initialize the OAuth2 Library
const oauth2 = require('simple-oauth2').create(credentials);

// Authorization uri definition
const authorizationUri = oauth2.authorizationCode.authorizeURL({
  redirect_uri: 'http://localhost:3000/duke_oauth/callback',
  scope: 'basic',
  state: 7711,
  response_type: 'token'
});

// Initial page redirecting to duke
router.get('/auth', (req, res) => {
  console.log(authorizationUri);
  res.redirect(authorizationUri);
});

// Callback service parsing the authorization token and asking for the access token
router.get('/callback', (req, res, next) => {
	console.log('----------In callback!!!');
	res.redirect('/users/profile');
});

router.get('/', (req, res) => {
	res.redirect('/users/profile');
});

module.exports = router;
