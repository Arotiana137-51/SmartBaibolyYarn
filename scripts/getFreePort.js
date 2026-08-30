const net = require('net');
const fs = require('fs');
const path = require('path');

const LOCK_FILE = path.join(__dirname, '..', '.metro.lock.json');

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

const isProcessAlive = pid => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const writeMetroLock = ({port, pid}) => {
  fs.writeFileSync(LOCK_FILE, JSON.stringify({port, pid}));
};

const clearMetroLock = () => {
  fs.rmSync(LOCK_FILE, {force: true});
};

// Reuses a Metro this project already started, so `yarn start` / `yarn android`
// run back-to-back don't pile up duplicate Metro instances.
const findRunningMetro = async ({host}) => {
  let lock;
  try {
    lock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
  } catch {
    return null;
  }

  const stillRunning = isProcessAlive(lock.pid) && !(await isPortFree(lock.port, host));
  if (!stillRunning) {
    clearMetroLock();
    return null;
  }

  return lock.port;
};

module.exports = {getFreePort, findRunningMetro, writeMetroLock, clearMetroLock};
