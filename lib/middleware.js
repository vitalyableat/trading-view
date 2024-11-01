import Cors from 'cors';
import morgan from 'morgan';

const corsMiddleware = Cors();
const morganMiddleware = morgan('tiny');

export function runMiddleware(req, res, fn) {
    return new Promise((resolve, reject) => {
        fn(req, res, (result) => {
            if (result instanceof Error) {
                return reject(result);
            }
            return resolve(result);
        });
    });
}

export async function applyMiddleware(req, res) {
    await runMiddleware(req, res, corsMiddleware);
    await runMiddleware(req, res, morganMiddleware);
}