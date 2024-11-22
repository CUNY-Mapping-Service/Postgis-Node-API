const qc = require("node-cache");


// create route
module.exports = function (fastify, opts, next) {
  const queryCache = new qc();
// route query
const sql = (params, query) => {
  let relationship = 'ST_Intersects';
  switch(params.relation_type){
    case 'overlaps': relationship = 'ST_Overlaps'; break; 
    case 'intersects': relationship = 'ST_Intersects'; break; 
    case 'crosses': relationship = 'ST_Crosses'; break; 
    case 'contains': relationship = 'ST_Contains'; break; 
    case 'contains_properly': relationship = 'ST_ContainsProperly'; break; 
    case 'within': relationship = 'ST_Within'; break; 
    case 'covers': relationship = 'ST_Covers'; break;
    case 'covered_by': relationship = 'ST_CoveredBy'; break;
    case 'touches': relationship = 'ST_Touches'; break;
    default: break;
  }
  return `
  SELECT 
    ${query.columns}
  
  FROM
    ${params.table_from},
    ${params.table_to}
  
  WHERE
    ${relationship}(
      ST_Buffer(${params.table_from}.${query.geom_column_from},${query.buffer ? query.buffer : 0}),
      ST_Buffer(${params.table_to}.${query.geom_column_to},${query.buffer ? query.buffer : 0})
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
  description: 'Find overlaps, intersects, crosses, contains, or contains_properly',
  tags: ['api'],
  summary: 'transform point to new SRID',
  params: {
    relation_type: {
      type: 'string',
      description: 'overlaps, intersects, crosses, contains, or contains_properly. Default is intersects',
      default: 'geom'
    },
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
    url: '/feature_relations/:relation_type/:table_from/:table_to',
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
       // console.log( sql(request.params, request.query))
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