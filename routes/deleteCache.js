const cp = require("child_process");

const schema = {
    description: 'Delete Cache',
    tags: ['meta'],
    summary: 'delete cache tables',
    querystring: {
        filter: {
            type: 'string',
            description: 'Optional filter parameters for a SQL WHERE statement.'
        }
    }
}

const url = `/delete-cache`;
const os = process.env.OS || 'WIN';

function isWhitelisted(_ip) {
    const whitelist = process.env.CACHE_RM_ALLOWED_IP.split(",");

    for (let i = 0; i < whitelist.length; i++) {
        if (whitelist[i] === _ip) {
            return true;
        }
    }
    return false;
}
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: url,
        schema: schema,
        handler: function (request, reply) {
            if (!isWhitelisted(request.ip)) {
                reply
                    .code(500)
                    //.header('Content-Type', 'application/json; charset=utf-8')
                    .send('Action not allowed from this IP')
                return
            }
            try {
                switch (os) {
                    case 'UNIX':
                        cp.exec("find . -name '*.mvt' -exec rm -r {} \\");
                        break;
                    case 'WIN': default:
                        cp.exec("del /s /q *.mvt");
                        break;
                }

                reply
                    .code(200)
                    //.header('Content-Type', 'application/json; charset=utf-8')
                    .send('Cache Deleted!')
            } catch (e) {
                reply
                    .code(200)
                    .header('Content-Type', 'application/json; charset=utf-8')
                    .send(e)
            }
        }
    })
    next()
}