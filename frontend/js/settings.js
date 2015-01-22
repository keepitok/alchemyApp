(function () {
    var editor = new JSONEditor($('form')[0], {
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
                    },
                    'default': ['FieldTerminology']
                }
            }
        },
        //startval: {},
        required: ['apiKey', 'minRelevance', 'amountInterests', 'entityType'],
        required_by_default: true,
        theme: 'bootstrap3'
    });

    var loader = new Loader();
    loader.show();

    var inno = new IframeHelper();
    inno.onReady(function () {
        inno.getProperties(function (status, data) {
            if (status) {
                editor.setValue(data);
            } else {
                alert('Error: unable to get Settings from Profile Cloud');
            }
            loader.hide();
        });
    });

    $('#submit-btn').on('click', function () {
        var errors = editor.validate();
        if (errors.length) {
            errors = errors.map(function (error) {
                var field = editor.getEditor(error.path),
                    title = field.schema.title;
                return title + ': ' + error.message;
            });
            alert(errors.join('\n'));
        } else {
            inno.setProperties(editor.getValue(), function (status) {
                if (status) {
                    alert('Settings were saved.');
                }
            });
        }
    });
})();