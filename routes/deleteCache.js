//const cp = require("child_process");
//const recache = require("recache")
const cache = require('../cache');
const schema = {
    description: 'Delete Cache',
    tags: ['meta'],
    summary: 'delete cache tables',
    security: [
        {
            "apiKey": []
        }
    ]
}

const url = `/delete-cache`;
const os = process.env.OS || 'WIN';
const fs = require('fs')
module.exports = function (fastify, opts, next) {


    fastify.route({
        method: 'GET',
        url: url,
        schema: schema,
        preHandler: (request, reply, done) => {
            if (request.headers['x-api-key'] !== process.env.PASSWORD) {
                reply
                    .code(500)
                    .send('Authorization required')
                console.log('no pw')
            } else {
                console.log('good pw')
            }
            done();
        },
        handler: function (request, reply) {
            const cacheFolder = `${process.argv.slice(2)[0]}` || '.';

          //  console.log(cacheFolder)

           const pathToEmpty = `${cacheFolder}/${process.env.CACHE_FOLDER || 'tilecache'}`;
           cache.destroy();
           fs.rmSync(pathToEmpty, { recursive: true, force: true });
           //cache.stop();
                             //require('fs-extra').emptyDir(pathToEmpty).then(()=>{
                                  cache.start(()=>{console.log('started')});
                                  reply
                        .code(200)
                        .send(cache.list())
                           //  })
                .catch(err => {
                    reply
                        .code(500)
                        .header('Content-Type', 'application/json; charset=utf-8')
                        .send(err)
                })

        }
    })
    next()
}