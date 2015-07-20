var express = require('express'),          // Using Express library for simple web server functionality
    bodyParser = require('body-parser'),
    inno = require('innometrics-helper');  // Innometrics helper to work with profile cloud

var app = express(),
    port = parseInt(process.env.PORT, 10);

// Parse application/json request
app.use(bodyParser.json());

/**
 * If your app's frontend part is going to communicate directly with backend, you need to allow this
 * https://en.wikipedia.org/wiki/Cross-origin_resource_sharing
 */
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

/**
 * Init params from environment variables. Innometrics platform sets environment variables during installation
 * to your Cloud Platform of choice.
 * If you use manual install of backend part to your own servers, you will need to setup these manually.
 */
var vars = {
    bucketName: process.env.INNO_BUCKET_ID,
    appKey: process.env.INNO_APP_KEY,
    apiUrl: process.env.INNO_API_HOST,
    appName: process.env.INNO_APP_ID,
    groupId: process.env.INNO_COMPANY_ID
};

var innoHelper = new inno.InnoHelper(vars);

// POST request to "/" is always expected to recieve stream with events
app.post('/', function (req, res) {
    return res.json({
        message: "Welcome to Innometrics profile cloud!"
    });
});


// Starting server
var server = app.listen(port, function () {
    console.log('Listening on port %d', server.address().port);
});
