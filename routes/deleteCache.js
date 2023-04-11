const cp = require("child_process");
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
//const fsExtra = require('fs-extra');
const fsAsync = require('node:fs/promises');
const path = require('path')

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
        handler: async function (request, reply) {
            const cacheFolder = `${process.argv.slice(2)[0]}` || '.';

          //  console.log(cacheFolder)

           const relPath = `${cacheFolder}/${process.env.CACHE_FOLDER || 'tilecache'}`;
          const pathToEmpty = path.join(__dirname.replace('\\routes',''),path.normalize(relPath));

           cache.destroy();
        
          cp.exec(`del /q /s ${path.normalize(pathToEmpty)}\\*.mvt`)
         // await fsAsync.unlink(path.normalize(pathToEmpty))
           // await fsAsync.readdir(path.normalize(pathToEmpty)).then((f) => {console.log(f); Promise.all(f.map(e => fsAsync.unlink(e)))})
               cache.start();

            reply
                .code(200)
                .send('success')
         //  })


         
                                 


        }
    })
    next()
}