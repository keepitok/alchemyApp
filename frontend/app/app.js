// message(true, 'App started');
// message(true, 'Current user', props.getCurrentUser());
// message(true, 'Current group', props.getCurrentGroup());
// message(true, 'Current bucket', props.getCurrentBucket());
// message(true, 'Current app', props.getCurrentApp());

// props.getProperties(function (status, data) {
//     message(status, 'Get properties: ', data);
// });

// props.setProperties({
//     qwe: getRandomValue(),
//     asd: getRandomValue(),
//     aaa: getRandomValue()
// }, function (status, data) {
//     message(status, 'Set properties: ', data);
// });

// props.getProperty('qwe', function (status, data) {
//     message(status, 'Get "qwe" property: ', data);
// });

// props.setProperty('asd', 4444, function (status, data) {
//     message(status, 'Set "asd" property: ', data);
// });

// props.getEventListeners(function (status, data) {
//     message(status, 'Get event listeners', data);
// });

// props.addEventListener({
//     "id": getRandomValue(),
//     "displayName": "Page view listener",
//     "collectApp": "web",
//     "section": "site",
//     "definitionId": "page-view"
// }, function (status, data) {
//     message(status, 'Add event listeners', data);
// });

// props.getProfileSchema(function (status, data) {
//     message(status, 'Get profile schema', data);
// });

var props = new IframeHelper();
props.onReady(function () {
    props.getProperty('apiKey', function (status, data) {
        $('#apiKey').val(data.value);
    });
});

function func() {
    props.setProperty('apiKey', $('#apiKey').val());
}