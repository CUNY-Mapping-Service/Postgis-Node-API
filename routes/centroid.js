const qc = require("node-cache");


// create route
module.exports = function (fastify, opts, next) {
  const queryCache = new qc();
// route query
const sql = (params, query) => {
  return `
  SELECT 
    -- Get X and Y of (potentially) geographically transformed geometry
    ST_X(
      ST_Transform(
        ${query.force_on_surface ? 'ST_PointOnSurface' : 'ST_Centroid'}(
          ${query.geom_column}
        ), ${query.srid})
    ) as x, 
    ST_Y(
      ST_Transform(
        ${query.force_on_surface ? 'ST_PointOnSurface' : 'ST_Centroid'}(
          ${query.geom_column}
        ), ${query.srid})
    ) as y

  FROM 
    ${params.table}

  -- Optional filter
  ${query.filter ? `WHERE ${query.filter}` : ''}

  `
}

// route schema
const schema = {
  description: 'Get the centroids of feature(s).',
  tags: ['api'],
  summary: 'feature(s) centroids',
  params: {
    table: {
      type: 'string',
      description: 'The name of the table or view to query.'
    }
  },
  querystring: {
    geom_column: {
      type: 'string',
      description: 'The geometry column of the table.',
      default: 'geom'
    },
    srid: {
      type: 'integer',
      description: 'The SRID for the returned centroids.',
      default: 4326
    },
    filter: {
      type: 'string',
      description: 'Optional filter parameters for a SQL WHERE statement.'
    },
    force_on_surface: {
      type: 'boolean',
      description: 'Set <em>true</em> to force point on surface. The default is <em>false</em>.',
      default: false
    }
  }
}
  fastify.route({
    method: 'GET',
    url: '/centroid/:table',
    schema: schema,
    handler: function (request, reply) {
      fastify.pg.connect(onConnect)

      function onConnect(err, client, release) {
        if (err)
          return reply.send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'unable to connect to database server'
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
          client.query(sql(request.params, request.query), function onResult(
            err,
            result
          ) {
            release()
            reply.send(err || result.rows)
            if (result && typeof result !== 'undefined' && result.rows){
                queryCache.set(key, result.rows, 900)
              }
          })
        }
      }
    }
  })
  next()
}

module.exports.autoPrefix = '/v1'