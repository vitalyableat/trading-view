const request = require('request');

/**
 * BitMart REST API wrapper.
 */
module.exports = class BitMart {
  /**
   * Current exchange trading rules and symbol information.
   * @returns {Promise} Response promise.
   */
  exchangeInfo() {
    return this.request('/spot/v1/symbols/details');
  }

  supportedResolutions() {
    return ['1', '5', '15', '30', '60', '240', '1440', '10080', '43200'];
  }

  /**
   * 1-Day ticker data
   * @param {string} symbol - Trading symbol.
   * @returns {Promise} Response promise.
   */
  ticker24hrs(symbol) {
    return this.request(`/spot/quotation/v3/ticker?symbol=${symbol}`);
  }

  /**
   * Kline/candlestick bars for a symbol. Klines are uniquely identified by their open time.
   * @param {string} symbol - Trading symbol.
   * @param {string} step - Klines interval.
   * @param {number} before - Start time in milliseconds.
   * @param {number} after - End time in milliseconds.
   * @param {number} limit - Klines limit.
   * @returns {Promise} Response promise.
   */

  klines(symbol, from, to, interval, limit) {
    const params = new URLSearchParams({
      symbol,
      // before: to,
      // after: from,
      step: interval,
      limit,
    });
    return this.request(`/spot/quotation/v3/lite-klines?${params.toString()}`);
  }

  /**
   * Common request.
   * @param {string} path - API path.
   * @param {object} options - request options.
   * @returns {Promise} Response promise.
   */
  request(path, options = {}) {
    return new Promise((resolve, reject) => {
      request(
        'https://api-cloud.bitmart.com' + path,
        options,
        (err, res, body) => {
          if (err) {
            return reject(err);
          }
          if (!body) {
            return reject(new Error('No body'));
          }

          try {
            const json = JSON.parse(body);
            if (json.code !== 1000) {
              const err = new Error(json.message);
              err.code = json.code;
              return reject(err);
            }
            return resolve(json.data);
          } catch (err) {
            return reject(err);
          }
        }
      );
    });
  }
};
