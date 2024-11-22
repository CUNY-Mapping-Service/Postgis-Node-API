const qc = require("node-cache");


// create route
module.exports = function (fastify, opts, next) {
  const queryCache = new qc();
// route query
const sql = (params, query) => {
  const [x, y, srid] = params.point.match(/^((-?\d+\.?\d+)(,-?\d+\.?\d+)(,[0-9]{4}))/)[0].split(',')

  return `
  SELECT 
    ST_X(
      ST_Transform(
        st_setsrid(
          st_makepoint(${x}, ${y}), 
          ${srid}
        ), 
        ${query.srid}
      )
    ) as x,
    ST_Y(
      ST_Transform(
        st_setsrid(
          st_makepoint(${x}, ${y}), 
          ${srid}
        ), 
        ${query.srid}
      )
    ) as y
  `
}

// route schema
const schema = {
  description: 'Transform a point to a different coordinate system.',
  tags: ['api'],
  summary: 'transform point to new SRID',
  params: {
    point: {
      type: 'string',
      pattern: '^((-?\\d+\\.?\\d+)(,-?\\d+\\.?\\d+)(,[0-9]{4}))',
      description: 'A point expressed as <em>X,Y,SRID</em>. Note for Lng/Lat coordinates, Lng is X and Lat is Y.'
    }
  },
  querystring: {
    srid: {
      type: 'integer',
      description: 'The SRID of the coordinate system to return the point in.',
      default: 4326
    }
  }
}
  fastify.route({
    method: 'GET',
    url: '/transform_point/:point',
    schema: schema,
    handler: function (request, reply) {
      fastify.pg.connect(onConnect)

      function onConnect(err, client, release) {
        if (err) return reply.send({
          "statusCode": 500,
          "error": "Internal Server Error",
          "message": "unable to connect to database server"
        })
        const key = request.url
        const cachedResp = queryCache.get(key);
        const size = queryCache.getStats().ksize+queryCache.getStats().vsize;
        const CACHE_SIZE_LIMIT = 25000;
        if(size > CACHE_SIZE_LIMIT){
          queryCache.flushAll()
        }
        if (typeof cachedResp !== 'undefined') {
          release();
          reply.send(cachedResp);
        } else {
          client.query(
            sql(request.params, request.query),
            function onResult(err, result) {
              release()
              reply.send(err || result.rows)
            }
          )
        }
      }
    }
  })
  next()
}

module.exports.autoPrefix = '/v1'