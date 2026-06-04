import { pino } from 'pino';

const env = process.env.NODE_ENV;

const level =
  env === 'test' ? 'silent' : process.env.LOG_LEVEL || (env === 'production' ? 'info' : 'debug');

const transport =
  env === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      }
    : undefined;

const logger = pino({
  level,
  transport,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token'],
    censor: '[REDACTED]',
  },
});

export default logger;
