const schema = {
    description: 'Reset Cache',
    tags: ['meta'],
    summary: 'Reset vector tile cache',
    security: [
        {
            "apiKey": []
        }
    ]
}

const url = `/reset-cache`;

module.exports = function (fastify, opts, next) {

    fastify.route({
        method: 'GET',
        url: url,
        schema: schema,
        preHandler: (request, reply, done) => {
            const apiKey = request.headers['x-api-key'];
            const correctApiKey = cacheManager.authenticate(apiKey);
        
            if (!correctApiKey) {
                reply.code(401).send('Authorization required');
            } else {
                console.log('Authorization successful');
            }
        
            done();
        },
        handler: async function (request, reply) {
            const cacheManager = require("../tileCacheManager");
            cacheManager.wipeAndRestart();
            reply
                .code(200)
                .send('Depricated, will revisit')
        }
    })
    next()
}