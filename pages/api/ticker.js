import { applyMiddleware } from "../../lib/middleware";
import Binance from "../../lib/exchanges/binance";
import MEXC from "../../lib/exchanges/mexc";
import KuCoin from "../../lib/exchanges/kucoin";
import Bitmart  from "../../lib/exchanges/bitmart";

const binance = new Binance();
const mexc = new MEXC();
const kucoin = new KuCoin();
const bitmart = new Bitmart();

export default async function handler(req, res) {
  await applyMiddleware(req, res);
  try {
    const { symbol, exchange } = req.query;
    if (!symbol || !exchange) {
      res.status(400).json({ s: "error", errmsg: "invalid request payload" });
      return;
    }

    const response =
      exchange.toLowerCase() === "binance"
        ? await binance.ticker24hrs(symbol)
        : exchange.toLowerCase() === "mexc"
        ? await mexc.ticker24hrs(symbol)
        : exchange.toLowerCase() === "kucoin"
        ? await kucoin.ticker24hrs(symbol)
        : exchange.toLowerCase() === "bitmart"
        ? await bitmart.ticker24hrs(symbol)
        : { lastPrice: 0, priceChange: 0, priceChangePercent: 0 };

    const lastPrice = parseFloat(response.lastPrice);
    const priceChange = parseFloat(response.priceChange);
    const priceChangePercent = parseFloat(response.priceChangePercent);

    res.status(200).json({ lastPrice, priceChange, priceChangePercent });
  } catch (err) {
    res.status(500).json({ s: "error", errmsg: "Internal Error" });
  }
}
