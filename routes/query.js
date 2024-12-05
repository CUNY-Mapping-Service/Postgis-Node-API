const qc = require("node-cache");



// create route
module.exports = function (fastify, opts, next) {
  const queryCache = new qc({ stdTTL: 600, checkperiod: 300 } );
  // route query
const sql = (params, query) => {
 
  let withGeojson = query.withGeojson === 'true';
  let tableStatement = `
  SELECT
    ${query.columns}
    `
    if(withGeojson){
      tableStatement += `, ST_asGeojson(ST_Transform(geom,4326)) as geojson`
    }
  
  tableStatement += `
  FROM
  ${params.table}

  -- Optional Filter
  ${query.filter ? `WHERE ${query.filter}` : ''}

  -- Optional Group
  ${query.group ? `GROUP BY ${query.group}` : ''}

  -- Optional sort
  ${query.sort ? `ORDER BY ${query.sort}` : ''}

  -- Optional limit
  ${query.limit ? `LIMIT ${query.limit}` : ''}

  `
  //console.log(tableStatement)

    return tableStatement
  
}

// route schema
const schema = {
  description: 'Query a table or view.',
  tags: ['api'],
  summary: 'table query',
  params: {
    table: {
      type: 'string',
      description: 'The name of the table or view.'
    }
  },
  querystring: {
    withGeojson: {
      type: 'string',
      description: 'Set to true to return geojson'
    },
    columns: {
      type: 'string',
      description: 'Columns to return.',
      default: '*'
    },
    filter: {
      type: 'string',
      description: 'Optional filter parameters for a SQL WHERE statement.'
    },
    sort: {
      type: 'string',
      description: 'Optional sort by column(s).'
    },
    limit: {
      type: 'integer',
      description: 'Optional limit to the number of output features.',
      default: 100
    },
    group: {
      type: 'string',
      description: 'Optional column(s) to group by.'
    }
  }
}

  fastify.route({
    method: 'GET',
    url: '/query/:table',
    schema: schema,
    handler: function (request, reply) {
      fastify.pg.connect(onConnect)
     // console.log('connect')
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
        //console.log(size)
        if (typeof cachedResp !== 'undefined') {
          release();
          reply.send(cachedResp);
        } else {
         console.log('not cached')
          client.query(
            sql(request.params, request.query),
            function onResult(err, result) {
              if(err) console.log(sql(request.params, request.query))
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
