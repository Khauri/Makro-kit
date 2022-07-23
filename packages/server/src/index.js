import {FastifyAdapter} from './core/adapters/fastify';
import Server from './core/server';

export const server = new Server({adapter: new FastifyAdapter()});
