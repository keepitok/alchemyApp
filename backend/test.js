var request = require('request'),
    fs = require('fs');

request.post({
    url: 'http://localhost:3000/',
    body: JSON.parse(fs.readFileSync('stream.json').toString()),
    json: true
}, function (error, response) {
    console.log(response.body);
});