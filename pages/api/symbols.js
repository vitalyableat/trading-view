import { applyMiddleware } from '../../lib/middleware';
import UDF from '../../lib/udf';
import { symbol as validateSymbol } from '../../lib/query';

const udf = new UDF();

export default async function handler(req, res) {
    await applyMiddleware(req, res);
    try {
        validateSymbol(req, res, () => {});
        const result = await udf.symbol(req.query.symbol);
        res.status(200).json(result);
    } catch (err) {
        if (err instanceof UDF.SymbolNotFound) {
            res.status(404).json({ s: 'error', errmsg: 'Symbol Not Found' });
        } else {
            res.status(200).json({ err: err?.message || 'unknown error' });
        }
    }
}