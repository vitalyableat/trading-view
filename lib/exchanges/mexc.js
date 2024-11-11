const request = require('request');

/**
 * MEXC REST API wrapper.
 */
module.exports = class MEXC {
  /**
   * Current exchange trading rules and symbol information.
   * @returns {Promise} Response promise.
   */
  exchangeInfo() {
    return this.request('/api/v3/exchangeInfo');
  }

  supportedResolutions() {
    return ['1', '5', '15', '30', '60', '240', '1D', '3D', '1W', '1M'];
  }

  /**
   * 1-Day ticker data
   * @param {string} symbol - Trading symbol.
   * @returns {Promise} Response promise.
   */
  ticker24hrs(symbol) {
    return this.request('/api/v3/ticker/24hr', { qs: { symbol } });
  }

  /**
   * Kline/candlestick bars for a symbol. Klines are uniquely identified by their open time.
   * @param {string} symbol - Trading symbol.
   * @param {string} interval - Klines interval.
   * @param {number} startTime - Start time in milliseconds.
   * @param {number} endTime - End time in milliseconds.
   * @param {number} limit - Klines limit.
   * @returns {Promise} Response promise.
   */
  klines(symbol, interval, startTime, endTime, limit) {
    return this.request('/api/v3/klines', {
      qs: { symbol, interval, startTime, endTime, limit },
    });
  }

  /**
   * Common request.
   * @param {string} path - API path.
   * @param {object} options - request options.
   * @returns {Promise} Response promise.
   */
  request(path, options = {}) {
    return new Promise((resolve, reject) => {
      request('https://api.mexc.com' + path, options, (err, res, body) => {
        if (err) {
          return reject(err);
        }
        if (!body) {
          return reject(new Error('No body'));
        }

        try {
          // const json = JSON.parse(body);
          const json = {};
          if (json.code && json.msg) {
            const err = new Error(json.msg);
            err.code = json.code;
            return reject(err);
          }
          return resolve(json);
        } catch (err) {
          return reject(err);
        }
      });
    });
  }
};
