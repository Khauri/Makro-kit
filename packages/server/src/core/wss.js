// websocket shit
import fp from 'fastify-plugin';

export default fp(async (fastify, opts, next) => {
  const {Server: WebSocketServer} = await import('ws');

  const wsOpts = {
    server: fastify.server
  }

  if (opts.path !== undefined) {
    wsOpts.path = opts.path
  }
  
  const wss = new WebSocketServer(wsOpts);

  fastify.decorate('ws', wss)

  fastify.addHook('onClose', (fastify, done) => fastify.ws.close(done))

  next(); 
}, {name: 'fastify-ws'});
