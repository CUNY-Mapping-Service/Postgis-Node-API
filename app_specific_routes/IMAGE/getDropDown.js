//IMAGE NYC ONLY
// route query
const qc = require("node-cache");
const queryCache = new qc();
let path = require('path');
let scriptFileName = path.basename(__filename);

const sql = (params, query) => {
  return `SELECT * FROM category_dropdowns`
}

// route schema
const schema = {
  description: 'List tables and views. Note the service user needs read permission on the geometry_columns view.',
  tags: ['IMAGE NYC'],
  summary: 'get dropdown list'
}

if(!process.env.CUSTOM_ROUTES) module.exports = function (fastify, opts, next) {next()}

if (process.env.CUSTOM_ROUTES.split(',').includes(scriptFileName)) {
  // create route
  console.log('exporting '+scriptFileName)

module.exports = function (fastify, opts, next) {
  fastify.route({
    method: 'GET',
    url: '/get_dropdown',
    schema: schema,
    handler: function (request, reply) {
      fastify.pg.connect(onConnect)

      function onConnect(err, client, release) {
        if (err) return reply.send({
          "statusCode": 500,
          "error": "Internal Server Error",
          "message": "unable to connect to database server. This endpoint is for IMAGE NYC ONLY"
        })
        const key = request.url
        const cachedResp = queryCache.get(key);
        if (typeof cachedResp !== 'undefined') {
          release();
          reply.send(cachedResp);
        } else {
          client.query(
            sql(request.params, request.query),
            function onResult(err, result) {
              release()

              let main = result.rows.filter(m => m.cattype === 'main').sort((a, b) => +a.sortorder - +b.sortorder);
              const sub1 = result.rows.filter(s => s.cattype === 'sub1').sort((a, b) => +a.sortorder - +b.sortorder);
              const sub2 = result.rows.filter(s => s.cattype === 'sub2').sort((a, b) => +a.sortorder - +b.sortorder);

              sub1.forEach((s1) => {
                s1.sub2List = sub2.filter(s => s.subgroup1 === s1.id)
              })

              main.forEach((mainGroup) => {
                mainGroup.sub1List = sub1.filter(s => s.maingroup === mainGroup.id)
              });

              reply.send(err || main)
              if (result && typeof result !== 'undefined' && result.rows) {
                queryCache.set(key, main, 900)
              }
            }
          )
        }
      }
    }
  })
  next()
}

module.exports.autoPrefix = '/v1'
}else{
  module.exports = function (fastify, opts, next) {next()}
}