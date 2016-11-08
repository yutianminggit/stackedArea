// translate default date value to value easier to use.
var moment = require('moment');

/**
 * @param type(string): The type of interval, based on column.aggregation.params.inteval.val
 * @param type(string): The value of the column
 * @return (string): Value after translate.
 */
var translate = function (type, val) {
  if (!type || typeof type !== 'string') {
    return val;
  }
  var format = '';
  switch (type) {
    // second
    case 's': format = 'HH:mm:ss'; break;
    // minute
    case 'm': format = 'HH:mm'; break;
    // hour
    case 'h': format = 'MMM/D HH:mm'; break;
    // daily
    case 'd':
    // weekly
    case 'w': format = 'YYYY-MM-DD'; break;
    // month
    case 'M': format = 'YYYY-MM'; break;
    // year
    case 'y': format = 'YYYY'; break;
    // other, such as Auto, custom, etc.
    default: break;
  }
  if (format !== '') {
    return moment(val).format(format);
  }
  return val;
};

module.exports = translate;
