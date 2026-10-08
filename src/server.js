const { createApp } = require('./app');

const port = Number.parseInt(process.env.PORT || '3000', 10);
const server = createApp().listen(port, '0.0.0.0', () => {
  process.stdout.write(`TextOps listening on 0.0.0.0:${port}\n`);
});

let shuttingDown = false;
process.on('SIGTERM', () => {
  if (shuttingDown) return;
  shuttingDown = true;
  process.stdout.write('Received SIGTERM; closing server.\n');
  server.close((error) => {
    if (error) {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    }
  });
  server.closeIdleConnections();
});
