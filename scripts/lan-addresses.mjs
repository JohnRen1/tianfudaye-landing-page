import { networkInterfaces } from 'node:os'
import { isIPv4 } from 'node:net'
import { pathToFileURL } from 'node:url'

// Only local physical-network addresses; never reuse an IP from a previous network.
export function getLanAddresses(interfaces = networkInterfaces()) {
  return [...new Set(Object.entries(interfaces).flatMap(([name, entries]) => {
    if (/^(lo|utun|tun|tap|wg|docker|veth|virbr|vmnet|vboxnet|br-|awdl|llw|tailscale|zt)/i.test(name)) return []
    return (entries ?? []).filter(({ address, family, internal }) => {
      if (internal || family !== 'IPv4' || !isIPv4(address)) return false
      const [first, second] = address.split('.').map(Number)
      return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168)
    }).map(({ address }) => address)
  }))]
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const addresses = getLanAddresses()
  if (addresses.length) console.log(addresses.join('\n'))
}
