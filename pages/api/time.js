import { applyMiddleware } from '../../lib/middleware';

export default async function handler(req, res) {
    await applyMiddleware(req, res);
    const time = Math.floor(Date.now() / 1000); // In seconds
    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send(time.toString());
}