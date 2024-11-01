import { applyMiddleware } from '../../lib/middleware';
import UDF from '../../lib/udf';
import { query as validateQuery, limit as validateLimit } from '../../lib/query';

const udf = new UDF();

export default async function handler(req, res) {
    await applyMiddleware(req, res);
    try {
        validateQuery(req, res, () => {});
        validateLimit(req, res, () => {});
        if (req.query.type === '') {
            req.query.type = null;
        }
        if (req.query.exchange === '') {
            req.query.exchange = null;
        }
        const result = await udf.search(
            req.query.query,
            req.query.type,
            req.query.exchange,
            req.query.limit
        );
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ s: 'error', errmsg: 'Internal Error' });
    }
}
