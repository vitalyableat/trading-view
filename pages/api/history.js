import { applyMiddleware } from '../../lib/middleware';
import UDF from '../../lib/udf';
import { symbol as validateSymbol, from as validateFrom, to as validateTo, resolution as validateResolution } from '../../lib/query';

const udf = new UDF();

export default async function handler(req, res) {
    await applyMiddleware(req, res);
    try {
        validateSymbol(req, res, () => {});
        validateFrom(req, res, () => {});
        validateTo(req, res, () => {});
        validateResolution(req, res, () => {});
        const result = await udf.history(
            req.query.symbol,
            req.query.from,
            req.query.to,
            req.query.resolution
        );
        res.status(200).json(result);
    } catch (err) {
        if (err instanceof UDF.SymbolNotFound) {
            res.status(404).json({ s: 'error', errmsg: 'Symbol Not Found' });
        } else if (err instanceof UDF.InvalidResolution) {
            res.status(400).json({ s: 'error', errmsg: 'Invalid Resolution' });
        } else {
            res.status(500).json({ s: 'error', errmsg: err.message });
        }
    }
}
