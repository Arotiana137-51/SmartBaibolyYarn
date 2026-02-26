const {spawn} = require('child_process');
const {getFreePort} = require('./getFreePort');

const main = async () => {
  const startPort = Number(process.env.METRO_PORT_START ?? 8081);
  const endPort = Number(process.env.METRO_PORT_END ?? 8099);
  const host = process.env.METRO_HOST ?? '127.0.0.1';

  const port = await getFreePort({startPort, endPort, host});
  // eslint-disable-next-line no-console
  console.log(`Starting Metro on port: ${port}`);

  const child = spawn('yarn', ['react-native', 'start', '--port', String(port)], {
    shell: true,
    stdio: 'inherit',
  });

  child.on('exit', code => process.exit(code ?? 0));
};

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
