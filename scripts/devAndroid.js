const {spawn} = require('child_process');
const {getFreePort} = require('./getFreePort');

const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: true,
      stdio: 'inherit',
      ...options,
    });

    child.on('exit', code => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const main = async () => {
  const startPort = Number(process.env.METRO_PORT_START ?? 8081);
  const endPort = Number(process.env.METRO_PORT_END ?? 8099);
  const host = process.env.METRO_HOST ?? '127.0.0.1';

  const port = await getFreePort({startPort, endPort, host});
  // eslint-disable-next-line no-console
  console.log(`Using Metro port: ${port}`);

  const metro = spawn('yarn', ['react-native', 'start', '--port', String(port)], {
    shell: true,
    stdio: 'inherit',
    detached: true,
  });

  metro.unref();

  await delay(2500);

  await run('yarn', ['react-native', 'run-android', '--port', String(port)]);
};

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
