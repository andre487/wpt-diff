var winston = require('winston');

var logger = new winston.Logger();

logger.configure({
    level: process.env.WPT_LOG_LEVEL || 'info',
    transports: [
        new winston.transports.Console({
            colorize: true,
            timestamp: true,
            stderrLevels: ['error', 'info', 'debug']
        })
    ]
});

module.exports = logger;
