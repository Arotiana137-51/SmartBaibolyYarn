const net = require('net');

const isListening = (port, host, timeoutMs = 200) =>
  new Promise(resolve => {
    const socket = net.connect({port, host});

    const finish = value => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', err => {
      // ECONNREFUSED / ENOTFOUND => no server listening
      // Other errors are treated as "not listening" to avoid false positives.
      if (err && (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND')) {
        finish(false);
        return;
      }
      finish(false);
    });
  });

const isPortFree = async (port, host = 'localhost') => {
  // Metro often listens on IPv6 (:::8081) on Windows.
  // Probing both v4 and v6 loopback avoids false "free" results.
  const listeningV4 = await isListening(port, '127.0.0.1');
  const listeningV6 = await isListening(port, '::1');
  return !(listeningV4 || listeningV6);
};

const getFreePort = async ({
  startPort,
  endPort,
  host,
}) => {
  for (let port = startPort; port <= endPort; port += 1) {
    // eslint-disable-next-line no-await-in-loop
    const free = await isPortFree(port, host);
    if (free) {
      return port;
    }
  }

  throw new Error(`No free port found in range ${startPort}-${endPort}`);
};

module.exports = {getFreePort};
