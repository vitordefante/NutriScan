// https://docs.expo.dev/guides/customizing-metro/
const http = require('node:http');

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/** API local (npm run dev:api). */
const API = { host: '127.0.0.1', port: 3333 };

/**
 * Em desenvolvimento, o Metro repassa /api/* para a API local. Assim o celular só precisa
 * alcançar UM endereço (o do Metro) — inclusive pelo túnel (`npx expo start --tunnel`), que
 * funciona em redes que isolam os aparelhos (roteador de casa, Wi-Fi da faculdade).
 */
function repassarParaApi(req, res) {
  const pedido = http.request(
    {
      ...API,
      path: req.url.slice('/api'.length),
      method: req.method,
      headers: { ...req.headers, host: `${API.host}:${API.port}` },
    },
    (resposta) => {
      res.writeHead(resposta.statusCode ?? 502, resposta.headers);
      resposta.pipe(res);
    },
  );
  pedido.on('error', () => {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('API local fora do ar (rode npm run dev:api).');
  });
  req.pipe(pedido);
}

const enhanceOriginal = config.server?.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    const base = enhanceOriginal ? enhanceOriginal(middleware, server) : middleware;
    return (req, res, next) =>
      req.url?.startsWith('/api/') ? repassarParaApi(req, res) : base(req, res, next);
  },
};

module.exports = config;
