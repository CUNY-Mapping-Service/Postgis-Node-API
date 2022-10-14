const qc = require("node-cache");
const queryCache = new qc();
// route query
const sql = (params, query) => {
  return `
      SELECT   
      ${params.table_to}.id, name, label, st_asgeojson(ST_Transform(${params.table_to}.geom,3857)) as geom
      from
      ${params.table_from},
      ${params.table_to}
      WHERE
      ST_Intersects(
        ${params.table_from}.geom,
        ${params.table_to}.geom
      )
      -- Optional Filter
      ${query.filter ? `AND ${query.filter}` : ''}
    `
}

// route schema
const schema = {
  description: 'Get districts that NTAs intersect with',
  tags: ['api'],
  summary: 'transform point to new SRID',
  params: {
    table_from: {
      type: 'string',
      description: 'Table to use as an overlay.'
    },
    table_to: {
      type: 'string',
      description: 'Table to be intersected.'
    }
  },
  querystring: {
    geom_column_from: {
      type: 'string',
      description: 'The geometry column of the from_table. The default is geom.',
      default: 'geom'
    },
    geom_column_to: {
      type: 'string',
      description: 'The geometry column of the to_table. The default is geom.',
      default: 'geom'
    },
    filter: {
      type: 'string',
      description: 'Optional filter parameters for a SQL WHERE statement.'
    }
  }
}

// create route
module.exports = function (fastify, opts, next) {
  fastify.route({
    method: 'GET',
    url: '/nta_intersect/:table_from/:table_to',
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
        if (typeof cachedResp !== 'undefined') {
          release();
          reply.send(cachedResp);
        } else {
          client.query(
            sql(request.params, request.query),
            function onResult(err, result) {
              release()
              reply.send(err || result.rows)
              if (result && typeof result !== 'undefined' && result.rows){
                queryCache.set(key, result.rows, 900)
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