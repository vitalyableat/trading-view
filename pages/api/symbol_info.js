import { applyMiddleware } from '../../lib/middleware';
import UDF from '../../lib/udf';

const udf = new UDF();

export default async function handler(req, res) {
    await applyMiddleware(req, res);
    try {
        const result = await udf.symbolInfo();
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ s: 'error', errmsg: 'Internal Error' });
    }
}