var formEl = $('form')[0];
var submitBtn = $('#submit-btn');
var editor = new JSONEditor(formEl, {
    disable_collapse: true,
    disable_edit_json: true,
    disable_properties: true,
    no_additional_properties: true,
    schema: {
        type: 'object',
        title: 'Alchemy app settings',
        properties: {
            apiKey: {
                title: 'API key',
                type: 'string',
                minLength: 40,
                maxLength: 40
            },
            minRelevance: {
                title: 'Minimal relevance',
                type: 'number',
                minimum: 0.1,
                maximum: 1,
                multipleOf: 0.1,
                'default': 0.1
            },
            amountInterests: {
                title: 'Amount of stored interests',
                type: 'number',
                minimum: 1,
                maximum: 20,
                multipleOf: 1,
                'default': 10
            },
            entityType: {
                title: 'Entity type',
                type: 'array',
                uniqueItems: true,
                items: {
                    type: 'string',
                    'enum': ['Anatomy', 'Automobile', 'Anniversary', 'City', 'Company', 'Continent', 'Country', 'Degree', 'Drug', 'EmailAddress', 'EntertainmentAward', 'Facility', 'FieldTerminology', 'FinancialMarketIndex', 'GeographicFeature', ' Hashtag ', 'HealthCondition', 'Holiday', 'IPAddress', 'JobTitle', 'Movie', 'MusicGroup', 'NaturalDisaster', 'OperatingSystem', 'Organization', 'Person', 'PrintMedia', 'Quantity', 'RadioProgram', 'RadioStation', 'Region', 'Sport', 'StateOrCounty', 'Technology', 'TelevisionShow', 'TelevisionStation', 'TwitterHandle']
                }
            }
        }
    },
    //startval: {},
    required: ['apiKey'],
    required_by_default: true,
    theme: 'bootstrap3'
});

var props = new IframeHelper();
props.onReady(function () {
    props.getProperties(function (status, data) {
        editor.setValue(data);
    });
});

submitBtn.on('click', function () {
    var errors = editor.validate();
    var errMsg = [];
    if (errors.length) {
        errors.forEach(function (err) {
            var field = editor.getEditor(err.path);
            var title = field.schema.title;
            errMsg.push(title + ': ' + err.message);
        });
        alert(errMsg.join('\n'));
    } else {
        props.setProperties(editor.getValue(), function (status /*, data*/ ) {
            if (status) {
                alert('Settings were saved.');
            }
        });
    }
});