const qc = require("node-cache");


// create route
module.exports = function (fastify, opts, next) {
  const queryCache = new qc();
// route query
const sql = (params, query) => {
  return `
  SELECT 
    ${query.columns}
  
  FROM
    ${params.table_from},
    ${params.table_to}
  
  WHERE
    ST_Intersects(
      ${params.table_from}.${query.geom_column_from},
      ${params.table_to}.${query.geom_column_to}
    )
    -- Optional Filter
    ${query.filter ? `AND ${query.filter}` : ''}

  -- Optional sort
  ${query.sort ? `ORDER BY ${query.sort}` : ''}

  -- Optional limit
  ${query.limit ? `LIMIT ${query.limit}` : ''}
  `
}

// route schema
const schema = {
  description: 'Transform a point to a different coordinate system.',
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
    columns: {
      type: 'string',
      description: 'Columns to return. Columns should be prefaced by the table name if the column name exists in both tables (ex: f.pid, t.prkname). The default is all columns.',
      default: '*'
    },
    filter: {
      type: 'string',
      description: 'Optional filter parameters for a SQL WHERE statement.'
    },
    distance: {
      type: 'integer',
      description: 'Buffer the overlay feature(s) by units of the geometry column.',
      default: 0
    },
    sort: {
      type: 'string',
      description: 'Optional sort column(s).'
    },
    limit: {
      type: 'integer',
      description: 'Optional limit to the number of output features.'
    }
  }
}
  fastify.route({
    method: 'GET',
    url: '/intersect_feature/:table_from/:table_to',
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