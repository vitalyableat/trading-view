const Binance = require('./exchanges/binance');
const MEXC = require('./exchanges/mexc');
const Kucoin = require('./exchanges/kucoin');
const Bitmart = require('./exchanges/bitmart');

class UDFError extends Error {}
class SymbolNotFound extends UDFError {}
class InvalidResolution extends UDFError {}

class UDF {
  constructor() {
    this.symbols = null;
    this.allSymbols = null;
    this.binance = new Binance();
    this.mexc = new MEXC();
    this.kucoin = new Kucoin();
    this.bitmart = new Bitmart();
    this.supportedResolutions = [
      '1',
      '5',
      '15',
      '30',
      '60',
      '240',
      '1D',
      '3D',
      '1W',
      '1M',
    ];

    this.loadSymbols();
    setInterval(() => {
      this.loadSymbols();
    }, 30000);
  }

  async symbolsReady() {
    while (!this.symbols) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  async loadSymbols() {
    const priceScale = (symbol, exchangeName) => {
      if (exchangeName === 'MEXC') {
        return Math.pow(10, symbol.quoteAssetPrecision);
      } else if (exchangeName === 'BINANCE') {
        for (let filter of symbol.filters) {
          if (filter.filterType === 'PRICE_FILTER') {
            return Math.round(1 / parseFloat(filter.tickSize));
          }
        }
      }
      return Math.round(1 / parseFloat(symbol.priceIncrement));
    };

    const fetchSymbols = async (exchange) => {
      try {
        const info = await exchange.exchangeInfo();
        const isKucoin = exchange.constructor.name.toUpperCase() === 'KUCOIN';
        const isBitmart = exchange.constructor.name.toUpperCase() === 'BITMART';
        return (isKucoin ? info.data : info.symbols).map((symbol) => ({
          symbol: symbol.symbol,
          ticker: symbol.symbol,
          name: symbol.symbol,
          full_name: symbol.symbol,
          description: isKucoin
            ? `${symbol.baseCurrency} / ${symbol.quoteCurrency}`
            : isBitmart
            ? `${symbol.base_currency} / ${symbol.quote_currency}`
            : `${symbol.baseAsset} / ${symbol.quoteAsset}`,
          exchange: exchange.constructor.name.toUpperCase(),
          listed_exchange: exchange.constructor.name.toUpperCase(),
          type: 'crypto',
          currency_code: isKucoin
            ? symbol.quoteCurrency
            : isBitmart
            ? symbol.quote_currency
            : symbol.quoteAsset,
          session: '24x7',
          timezone: 'UTC',
          minmovement: 1,
          minmov: 1,
          minmovement2: 0,
          minmov2: 0,
          pricescale: priceScale(
            symbol,
            exchange.constructor.name.toUpperCase()
          ),
          supported_resolutions: [...exchange.supportedResolutions()],
          has_intraday: true,
          has_daily: true,
          has_weekly_and_monthly: true,
          data_status: 'streaming',
        }));
      } catch (err) {
        console.error(err);
        setTimeout(() => {
          this.loadSymbols();
        }, 1000);
        return [];
      }
    };

    const binanceSymbols = await fetchSymbols(this.binance);
    const mexcSymbols = await fetchSymbols(this.mexc);
    const kucoinSymbols = await fetchSymbols(this.kucoin);
    const bitmartSymbols = await fetchSymbols(this.bitmart);

    this.symbols = Promise.resolve([
      ...binanceSymbols,
      ...mexcSymbols,
      ...kucoinSymbols,
      ...bitmartSymbols,
    ]);

    this.allSymbols = Promise.resolve(
      new Set([
        ...binanceSymbols.map((s) => s.symbol),
        ...mexcSymbols.map((s) => s.symbol),
        ...kucoinSymbols.map((s) => s.symbol),
        ...bitmartSymbols.map((s) => s.symbol),
      ])
    );
  }

  async checkSymbol(symbol) {
    await this.symbolsReady();
    const symbols = await this.allSymbols;
    return symbols.has(symbol);
  }

  asTable(items) {
    const result = {};
    for (const item of items) {
      for (const key in item) {
        if (!result[key]) {
          result[key] = [];
        }
        result[key].push(item[key]);
      }
    }
    for (const key in result) {
      const values = [...new Set(result[key])];
      if (values.length === 1) {
        result[key] = values[0];
      }
    }
    return result;
  }

  async config() {
    return {
      exchanges: [
        {
          value: 'ALL',
          name: 'All',
          desc: 'All Exchanges',
        },
        {
          value: 'BINANCE',
          name: 'Binance',
          desc: 'Binance Exchange',
        },
        {
          value: 'MEXC',
          name: 'MEXC',
          desc: 'MEXC Exchange',
        },
        {
          value: 'KUCOIN',
          name: 'KUCOIN',
          desc: 'KUCOIN Exchange',
        },
        {
          value: 'BITMART',
          name: 'BitMart',
          desc: 'BitMart Exchange',
        },
      ],
      symbols_types: [
        {
          value: 'crypto',
          name: 'Cryptocurrency',
        },
      ],
      supported_resolutions: this.supportedResolutions,
      supports_search: true,
      supports_group_request: false,
      supports_marks: false,
      supports_timescale_marks: false,
      supports_time: true,
    };
  }

  async symbolInfo() {
    await this.symbolsReady();
    const symbols = await this.symbols;
    return this.asTable(symbols);
  }

  async symbol(symbol) {
    await this.symbolsReady();
    const symbols = await this.symbols;
    const comps = symbol.split(':');
    const s = (comps.length > 1 ? comps[1] : symbol).toUpperCase();

    for (const symbol of symbols) {
      if (symbol.symbol === s) {
        return symbol;
      }
    }

    throw new SymbolNotFound();
  }

  async search(query, type, exchange, limit) {
    await this.symbolsReady();
    let symbols = await this.symbols;

    if (type) {
      symbols = symbols.filter((s) => s.type === type);
    }

    if (exchange && exchange !== 'ALL') {
      symbols = symbols.filter((s) => s.exchange === exchange.toUpperCase());
    }

    query = query.toUpperCase();
    symbols = symbols.filter((s) => s.symbol.indexOf(query) >= 0);

    if (limit) {
      symbols = symbols.slice(0, limit);
    }

    return symbols.map((s) => ({
      symbol: s.symbol,
      full_name: s.full_name,
      description: s.description,
      exchange: s.exchange,
      ticker: s.ticker,
      type: s.type,
    }));
  }

  async history(symbol, from, to, resolution) {
    await this.symbolsReady();

    const hasSymbol = await this.checkSymbol(symbol);
    if (!hasSymbol) {
      throw new SymbolNotFound();
    }

    const RESOLUTIONS_INTERVALS_MAP = {
      binance: {
        1: '1m',
        5: '5m',
        15: '15m',
        30: '30m',
        60: '1h',
        240: '4h',
        D: '1d',
        '1D': '1d',
        W: '1w',
        '1W': '1w',
        M: '1M',
        '1M': '1M',
      },
      mexc: {
        1: '1m',
        5: '5m',
        15: '15m',
        30: '30m',
        60: '60m',
        240: '4h',
        D: '1d',
        '1D': '1d',
        W: '1W',
        '1W': '1W',
        M: '1M',
        '1M': '1M',
      },
      kucoin: {
        1: '1min',
        5: '5min',
        15: '15min',
        30: '30min',
        60: '1hour',
        240: '4hour',
        D: '1day',
        '1D': '1day',
        W: '1week',
        '1W': '1week',
        M: '1month',
        '1M': '1month',
      },
      bitmart: {
        1: '1',
        5: '5',
        15: '15',
        30: '30',
        60: '60',
        240: '240',
        1440: '1d',
        10080: '1w',
        43200: '1m',
      },
    };

    let totalKlines = [];

    const symbolInfo = await this.symbol(symbol);
    const exchange =
      symbolInfo.exchange === 'BINANCE'
        ? this.binance
        : symbolInfo.exchange === 'MEXC'
        ? this.mexc
        : symbolInfo.exchange === 'BITMART'
        ? this.bitmart
        : this.kucoin;

    const isKucoin = exchange.constructor.name.toUpperCase() == 'KUCOIN';
    const isBitmart = exchange.constructor.name.toUpperCase() === 'BITMART';
    const isMEXC = exchange.constructor.name.toUpperCase() == 'MEXC';

    const interval = isKucoin
      ? RESOLUTIONS_INTERVALS_MAP['kucoin'][resolution]
      : isMEXC
      ? RESOLUTIONS_INTERVALS_MAP['mexc'][resolution]
      : isBitmart
      ? RESOLUTIONS_INTERVALS_MAP['bitmart'][resolution]
      : RESOLUTIONS_INTERVALS_MAP['binance'][resolution];

    if (!interval) {
      throw new InvalidResolution();
    }

    if (isKucoin) {
      try {
        const klinesResponse = await exchange.klines(
          symbol,
          interval,
          from,
          to,
          1500
        );
        if (
          !klinesResponse ||
          !klinesResponse.data ||
          klinesResponse.data.length === 0
        ) {
          console.warn(`No data returned from KuCoin for symbol: ${symbol}`);
          return { s: 'no_data' };
        }
        const klines = klinesResponse.data.reverse();
        return {
          s: 'ok',
          t: klines.map((b) => Math.floor(b[0])),
          c: klines.map((b) => parseFloat(b[2])),
          o: klines.map((b) => parseFloat(b[1])),
          h: klines.map((b) => parseFloat(b[3])),
          l: klines.map((b) => parseFloat(b[4])),
          v: klines.map((b) => parseFloat(b[5])),
        };
      } catch (error) {
        console.error('Error fetching KuCoin klines:', error);
        throw new UDFError('Error fetching KuCoin klines');
      }
    }
    if (isBitmart) {
      try {
        const klinesResponse = await exchange.klines(
          symbol,
          from,
          to,
          interval,
          200
        );
        if (!klinesResponse || klinesResponse.length === 0) {
          console.warn(`No data returned from BitMart for symbol: ${symbol}`);
          return { s: 'no_data' };
        }
        const klines = klinesResponse.reverse();
        return {
          s: 'ok',
          t: klines.map((b) => Math.floor(b[0])),
          o: klines.map((b) => parseFloat(b[1])),
          h: klines.map((b) => parseFloat(b[2])),
          l: klines.map((b) => parseFloat(b[3])),
          c: klines.map((b) => parseFloat(b[4])),
          v: klines.map((b) => parseFloat(b[5])),
          qv: klines.map((b) => parseFloat(b[6])),
        };
      } catch (error) {
        console.error('Error fetching BitMart klines:', error);
        throw new UDFError('Error fetching BitMart klines');
      }
    }
    while (true) {
      const klines = await exchange.klines(
        symbol,
        interval,
        from * 1000,
        to * 1000,
        500
      );
      const limit = 500;
      totalKlines = totalKlines.concat(klines);

      if (klines.length === limit) {
        from = klines[klines.length - 1][0] + 1;
      } else {
        if (totalKlines.length === 0) {
          return { s: 'no_data' };
        } else {
          return {
            s: 'ok',
            t: totalKlines.map((b) => Math.floor(b[0] / 1000)),
            c: totalKlines.map((b) => parseFloat(b[4])),
            o: totalKlines.map((b) => parseFloat(b[1])),
            h: totalKlines.map((b) => parseFloat(b[2])),
            l: totalKlines.map((b) => parseFloat(b[3])),
            v: totalKlines.map((b) => parseFloat(b[5])),
          };
        }
      }
    }
  }
}

UDF.Error = UDFError;
UDF.SymbolNotFound = SymbolNotFound;
UDF.InvalidResolution = InvalidResolution;

module.exports = UDF;
