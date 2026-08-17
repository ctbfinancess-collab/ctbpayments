import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from '../src/config/env.js';

test('development and test listen on all local interfaces by default', () => {
  assert.equal(loadConfig({ NODE_ENV: 'development' }).host, '0.0.0.0');
  assert.equal(loadConfig({ NODE_ENV: 'test' }).host, '0.0.0.0');
});

test('production defaults to loopback and allows an explicit deployment host', () => {
  assert.equal(loadConfig({ NODE_ENV: 'production' }).host, '127.0.0.1');
  assert.equal(loadConfig({ NODE_ENV: 'production', HOST: '0.0.0.0' }).host, '0.0.0.0');
});

test('invalid hosts are rejected', () => {
  assert.throws(() => loadConfig({ NODE_ENV: 'development', HOST: 'host with spaces' }), /HOST/);
});

test('staging is an accepted NODE_ENV and binds like development by default', () => {
  const config = loadConfig({ NODE_ENV: 'staging' });
  assert.equal(config.nodeEnv, 'staging');
  assert.equal(config.host, '0.0.0.0');
});

test('CORS_ORIGINS is parsed into a trimmed, comma-separated list', () => {
  assert.deepEqual(loadConfig({ NODE_ENV: 'staging', CORS_ORIGINS: ' https://app.ctbxpayments.com , http://localhost:19006 ' }).corsOrigins, ['https://app.ctbxpayments.com', 'http://localhost:19006']);
  assert.deepEqual(loadConfig({ NODE_ENV: 'staging' }).corsOrigins, []);
});
