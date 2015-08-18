/*global IframeHelper, Loader, $*/
$(function () {
    var $ = window.$;
    var inno = new IframeHelper();
    var loader = new Loader();
    loader.show();
    var backendUrl;
    var $chart = $('#chart');

    /**
     * Main entry point
     */
    inno.onReady(function () {
        updateChart(function () {
            loader.hide();
        });
    });

    /**
     * Refresh button click listener
     */
    $('#refresh').click(function () {
        loader.show();
        updateChart(function () {
            loader.hide();
        });
    });

    //
    // Some helpers
    //

    /**
     * Get widget settings about which interests to show on chart
     * @param callback
     */
    function getWidgetSettings (callback) {
        inno.getWidgetSettings(function (status, data) {
            var error = null;
            if (!status) {
                error = new Error('Can not get settings');
            }
            callback(error,  data);
        });
    }

    /**
     * Get interests data collected by backend part of application
     * @param callback
     */
    function getInterestsData (callback) {
        inno.getProperties(function (status, data) {
            var error = null,
                interests = null;
            if (!status) {
                error = new Error('Can not get interests data');
            } else {
                data = data || {};
                interests = data.commonData || {};
            }

            /*
            // TODO replace test data with real
            interests = {
                "Dogs": 10,
                "Cats": 100
            };
            */
            callback(error, interests);
        });
    }

    /**
     * Render chart by certain data
     * @param {String} title
     * @param {Object} data
     */
    function renderChart(title, data, settings) {
        settings = settings || {};
        var plotData = prepareJQPlotData(data);
        if (!plotData.length) {
            $chart.html('No data for display');
            return;
        }

        var defaultConfig = {
                title: title,
                grid: {
                    borderWidth: 0,
                    shadow: false
                }
            },
            config = $.extend(
                defaultConfig,
                getJQPlotConfigByType(settings.chartType) // (pie or bar)
            );

        $.jqplot(
            'chart',
            [plotData],
            config
        );
    }

    /**
     * Update chart: get new data, refresh picture
     * @param callback
     */
    function updateChart (callback) {
        getWidgetSettings(function (error, settings) {
            if (error) {
                console.error(error);
                return callback(error);
            } else {
                getInterestsData(function (error, interests) {
                    if (error) {
                        console.error(error);
                    } else {
                        renderChart('Interests', interests, settings);
                    }
                    callback(error);
                });
            }

        });
    }

    /**
     * Prepare data for JQPlot config
     * @param interests
     */
    function prepareJQPlotData (interests) {
        return Object.keys(interests).map(function (name) {
            return [
                name,
                interests[name]
            ];
        }).sort(function (rec1, rec2) {
            // sort by values
            return rec2[1] - rec1[1];
        });
    }

    function getJQPlotConfigByType (type) {
        var config;
        type = type || 'bar';

        switch (type) {

            case 'pie':
                config = {
                    seriesDefaults: {
                        // Make this a pie chart.
                        renderer: $.jqplot.PieRenderer,
                        rendererOptions: {
                            // Put data labels on the pie slices.
                            // By default, labels show the percentage of the slice.
                            showDataLabels: true
                        }
                    },
                    legend: { show:true, location: 'e' }
                };
                break;

            case 'bar':
                config = {
                    axesDefaults: {
                        tickRenderer: $.jqplot.CanvasAxisTickRenderer ,
                        tickOptions: {
                            angle: -30,
                            fontSize: '10pt'
                        }
                    },
                    axes: {
                        xaxis: {
                            renderer: $.jqplot.CategoryAxisRenderer
                        }
                    },
                    series: [{
                        renderer: $.jqplot.BarRenderer
                    }],
                    highlighter: {
                        show: true,
                        sizeAdjust: 7.5,
                        tooltipAxes: 'y'
                    }
                };
                break;

            default:
                throw new Error('Unsupported chart type: ' + type);
        }

        return config;
    }



});
