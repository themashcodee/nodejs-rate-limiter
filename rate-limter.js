const Redis = require('ioredis');

const client = new Redis({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    password: process.env.DATABASE_PASSWORD,
});

const LIMIT_PER_MIN = 10

async function rate_limiter(req, res, next) {
    const user_data = await client.get(req.ip)

    if (!user_data) {
        client.set(req.ip, JSON.stringify({
            timestamp: new Date().getTime(),
            tokens_remaining: LIMIT_PER_MIN,
        }))
        return next()
    }

    const data = JSON.parse(user_data)

    if (data.tokens_remaining > 0) {
        data.tokens_remaining = data.tokens_remaining - 1
        client.set(req.ip, JSON.stringify(data))
        return next()
    }

    const current_time = new Date().getTime()
    const time_diff = current_time - data.timestamp

    if (time_diff > 60000) {
        client.set(req.ip, JSON.stringify({
            timestamp: new Date().getTime(),
            tokens_remaining: LIMIT_PER_MIN,
        }))
        return next()
    }

    return res.status(429).json({
        message: `You have exceeded the limit of ${LIMIT_PER_MIN} requests per minute`
    })
}

module.exports = {
    rate_limiter
}