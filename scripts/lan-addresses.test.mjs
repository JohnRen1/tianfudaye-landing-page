import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getLanAddresses } from './lan-addresses.mjs'

const ipv4 = (address, internal = false) => ({ address, family: 'IPv4', internal })
test('discovers current physical LAN addresses and removes duplicates', () => {
  assert.deepEqual(getLanAddresses({ en0: [ipv4('192.168.0.128')], en1: [ipv4('10.0.0.2'), ipv4('10.0.0.2')] }), ['192.168.0.128', '10.0.0.2'])
  assert.deepEqual(getLanAddresses({ en1: [ipv4('192.168.3.147')] }), ['192.168.3.147'])
})
test('excludes loopback, VPN, virtual, public and IPv6 addresses; no fixed fallback', () => {
  assert.deepEqual(getLanAddresses({ lo0: [ipv4('127.0.0.1', true)], utun0: [ipv4('10.0.0.1')], docker0: [ipv4('172.17.0.1')], en0: [ipv4('8.8.8.8'), { address: 'fe80::1', family: 'IPv6', internal: false }] }), [])
})
