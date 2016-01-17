var winston = require('winston');

var logger = new winston.Logger();

logger.configure({
    level: process.env.WPT_LOG_LEVEL || 'info',
    transports: [
        new winston.transports.Console({
            label: 'wpt-diff',
            colorize: true,
            timestamp: true,
            prettyPrint: true,
            stderrLevels: ['error', 'info', 'debug']
        })
    ]
});

module.exports = logger;
