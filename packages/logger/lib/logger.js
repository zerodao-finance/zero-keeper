'use strict';

const globalObject = require('the-global-object');
const chalk = require('chalk/index');
const moment = require('moment');
const util = require('util');

exports.createLogger = (module, __console) => new (class Logger {
  static LEVELS = {
    info: 'cyan',
    error: 'red',
    warn: 'yellow'
  }
  constructor(_console) {
    this.console = console;
  }
  toString(v) {
    if (typeof v === 'string') return v;
    else return util.inspect(v, { colors: true, depth: 15 });
  }
  formatMessage(level, message) {
    const LEVELS = this.constructor.LEVELS;
    if (!LEVELS[level]) throw Error('no loglevel found: ' + level);
    return chalk[LEVELS[level]](module + '|' + moment(new Date()).format('MM-DD-YYYY/HH:mm:ss') + '|' + level + '|') + this.toString(message);
    return message;
  }
  info(v) {
    this.console.log(this.formatMessage('info', v));
    return v;
  }
  warn(v) {
    this.console.log(this.formatMessage('warn', v));
    return v;
  }
  error(v) {
    this.console.error(this.formatMessage('error', v));
    return v;
  }
})(globalObject.console)
