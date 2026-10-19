import base from './e2e.config';
export default {
  ...base,
  secrets: { maestroSession: process.env.MAESTRO_CAPTURE_SESSION! },
  credentials: { ...base.credentials, maestro: {
    username: process.env.MAESTRO_CAPTURE_EMAIL!,
    password: process.env.MAESTRO_CAPTURE_PASSWORD!,
  } },
  targets: base.targets.map(t => ({ ...t, app: { ...t.app, url: 'http://maestro.localhost:3000' } })),
};
