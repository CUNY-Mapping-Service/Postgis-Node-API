const cp = require("child_process");

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

module.exports = function (fastify, opts, next) {
   

    fastify.route({
        method: 'GET',
        url: url,
        schema: schema,
        preHandler: (request, reply, done) => {
            if(request.headers['x-api-key']!==process.env.PASSWORD){
                reply
                    .code(500)
                    .send('Authorization required')
                console.log('no pw')
            }else{
            	console.log('good pw')
            }
            done();
        },
        handler: function (request, reply) {
            const cacheFolder =`${process.argv.slice(2)[0]}` || '.';
            try {
                switch (os) {
                    case 'UNIX':
                        cp.exec("find . -name '*.mvt' -exec rm -r {} \\");
                        break;
                    case 'WIN': default:
                        cp.exec(`del /s /f ${cacheFolder}*.mvt`,(error, stdout, stderr) => {
                          if (error) {
                             reply
                                .code(500)
                                .send(error)
                            return;
                          }
                           reply
                    .code(200)
                    .send(stdout)
                      })
                        break;
                }

               
               console.log('success')
            } catch (e) {
            	console.log(e)
                reply
                    .code(500)
                    .header('Content-Type', 'application/json; charset=utf-8')
                    .send(e)
            }
        }
    })
    next()
}