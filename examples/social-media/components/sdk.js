// This is a basic swagger -> sdk generator using proxies
// It IS NOT robust
import api from '@api';
import superagent from 'superagent';
import z from 'zod';

function parsePathItem(pathItem) {

}

function parsePath(path, server, root) {
  const [route, pathItems] = path;
  const parts = route.slice(1).split('/');
  parts.reduce((acc, part) => {
    acc[part] ??= {};
    return acc[part];
  }, server);
  console.log(server);
  Object.entries(pathItems).forEach(([method, pathItem]) => {
    // recursively create the path

  });
}

function parseDocument(document = {}) {
  const {paths, servers = []} = document;
  if(!servers.length) {
    servers.push({url: '/'})
  }
  const root = {};
  servers.forEach(server => {
    root[server.url] = server;
    Object.entries(paths).forEach((path) => {
      parsePath(path, root[server.url], root);
    });
  });
}

export default parseDocument(api);