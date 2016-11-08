import moment from 'moment';
import uiModules from 'ui/modules';
import _ from 'lodash';
import translate from 'plugins/stackedArea/date_time_format';

import visTypes from 'ui/registry/vis_types';
import TemplateVisTypeProvider from 'ui/template_vis_type/TemplateVisType';
import VisSchemasProvider from 'ui/Vis/Schemas';

import './less/main.less';
import template from './templates/index.html';

import echarts from 'plugins/stackedArea/lib/echarts.min';

uiModules
  .get('app/stackedArea', [])
  .controller('stackedAreaController', function ($scope, $timeout, Private) {
    const tabifyAggResponse = Private(require('ui/agg_response/tabify/tabify'));

    function add(array, value) {
      if (array.indexOf(value) === -1) {
        array.push(value);
      }
    }

    function series(array, name, value) {
      for (let i = 0; i < array.length; i++) {
        if (array[i].name === name) {
          array[i].data.push(value);
          return;
        }
      }
      array.push({
        name,
        type: 'line',
        stack: 'total',
        itemStyle: { normal: { areaStyle: { type: 'default' } } },
        data: [value]
      });
    }

    function processTableGroups(tableGroups, $scope) {
      var columnAggId = _.first(_.pluck($scope.vis.aggs.bySchemaName['columns'], 'id'));
      var rowAggId = _.first(_.pluck($scope.vis.aggs.bySchemaName['rows'], 'id'));
      var metricsAggId = _.first(_.pluck($scope.vis.aggs.bySchemaName['metric'], 'id'));
      var dataLabels = { [columnAggId]: 'col', [rowAggId]: 'row', [metricsAggId]: 'value' };

      var data = { col: [], row: [], value: [] };
      var cells = [];
      tableGroups.tables.forEach(function (table) {
        table.rows.forEach(function (row) {
          var cell = {};

          table.columns.forEach(function (column, i) {

            var fieldFormatter = table.aggConfig(column).fieldFormatter();
            // Median metric aggs use the parentId and not the id field
            var key = column.aggConfig.parentId ? dataLabels[column.aggConfig.parentId] : dataLabels[column.aggConfig.id];

            var type = column.aggConfig.type;

            if (key) {
              if (type.name === 'date_histogram') {
                cell[key] = translate(column.aggConfig.params.interval.val, row[i]);
              } else {
                cell[key] = key !== 'value' ? fieldFormatter(row[i]) : row[i];
              }
            }
            if (key && key !== 'value') {
              add(data[key], cell[key]);
            } else {
              series(data.value, cell['row'], row[i]);
            }
          });

          // if no columns or rows, then return '_all'
          if (!cell.col && !cell.row) {
            cell['col'] = '_all';
          }

          cells.push(cell);
        });
      });

      return data;
    };
    $scope.option = {
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: []
      },
      toolbox: {
        show: true,
        feature: {
          mark: { show: true },
          dataView: { show: true, readOnly: false },
          magicType: { show: true, type: ['line', 'bar', 'stack', 'tiled'] },
          restore: { show: true },
          saveAsImage: { show: true }
        }
      },
      calculable: true,
      xAxis: [
        {
          type: 'category',
          boundaryGap: false,
          data: []
        }
      ],
      yAxis: [
        {
          type: 'value'
        }
      ],
      series: []
    };

    function init() {
      $scope.myChart = echarts.init(document.getElementsByName('echart')[0]);
      $scope.myChart.setOption($scope.option);
    }

    $timeout(() => {
      init();
    });

    window.onresize = () => {
      $scope.myChart.resize();
    };

    $scope.$watch('esResponse', (resp) => {
      if (!resp) {
        $scope.data = null;
        return;
      }
      $scope.data = processTableGroups(tabifyAggResponse($scope.vis, resp), $scope);
      console.log($scope.vis);
      $scope.option.title = { text: $scope.vis.title };
      $scope.option.legend.data = $scope.data.row;
      $scope.option.xAxis[0].data = $scope.data.col;
      $scope.option.series = $scope.data.value;
      $scope.myChart.setOption($scope.option);
    });

  });

visTypes.register(Private => {
  const TemplateVisType = Private(TemplateVisTypeProvider);
  const Schemas = Private(VisSchemasProvider);

  return new TemplateVisType({
    name: 'stackedArea',
    title: 'Stacked Area',
    icon: 'fa-child',
    description: 'Multiple series stack, based on Echarts',
    template,
    params: {

    },
    schemas: new Schemas([
      {
        group: 'metrics',
        name: 'metrics',
        title: 'Cell',
        min: 1,
        aggFilter: ['avg', 'sum', 'count', 'min', 'max', 'median', 'cardinality'],
        defaults: [
          { schema: 'metrics', type: 'count' }
        ]
      }, {
        group: 'buckets',
        name: 'columns',
        icon: 'fa fa-ellipsis-v',
        title: 'Columns',
        min: 1,
        max: 1,
        aggFilter: '!geohash_grid'
      }, {
        group: 'buckets',
        name: 'rows',
        icon: 'fa fa-ellipsis-h',
        title: 'Rows',
        min: 1,
        max: 1,
        aggFilter: '!geohash_grid'
      }
    ])
  });
});
