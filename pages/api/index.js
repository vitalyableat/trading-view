import { applyMiddleware } from '../../lib/middleware';

export default async function handler(req, res) {
    await applyMiddleware(req, res);
    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send('Welcome to the Binance UDF Adapter for TradingView. See ./config for more details.');
}