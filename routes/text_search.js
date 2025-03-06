// route query
const qc = require("node-cache");


// create route
module.exports = function (fastify, opts, next) {
  const queryCache = new qc();

const sql = (params, query) => {
  const return_cols = query.return_columns || '*';

  const searchText = query.queryText.replace(/[ ]/g,',') || '';

 let withGeojson = query.withGeojson === 'true';

  const where = ()=>{
    if(!query.ts_columns) return `WHERE ts @@ to_tsquery('english', '${searchText}')`;

    let cols = query.ts_columns.split(',');
    if(cols.length === 1) return `WHERE ${query.ts_columns} @@ to_tsquery('english', '${searchText}')`;

    let whereStatement = ' WHERE'
    for(let c=0;c<cols.length;c++){
      whereStatement+=` ${cols[c]} @@ to_tsquery('english', '${searchText}:*')`
      if(c<cols.length-1) whereStatement += ' OR'
    }
    return whereStatement;
  }

 
  return `
  SELECT ${withGeojson?'ST_asGeojson(ST_Transform(geom,4326)) as geojson, ':''} ${return_cols}
  FROM ${params.table}
  ${where()}
   ${query.limit ? `LIMIT ${query.limit}` : ''}
  `
}

// route schema
const schema = {
  description: 'Use ts vector to search for table or view with english text',
  tags: ['api'],
  summary: 'text search',
  params: {
    table: {
      type: 'string',
      description: 'The name of the table or view.'
    }
  },
  querystring: {
    ts_columns: {
      type: 'string',
      description: 'Name of the ts vector column or comma separated columns',
      default:'ts'
    },
    return_columns: {
      type: 'string',
      description: 'Columns to return',
      default: '*'
    },
    queryText: {
      type: 'string',
      description: 'Text to search'
    },
     withGeojson: {
      type: 'string',
      description: 'Set to true to return geojson'
    },
    limit: {
      type: 'integer',
      description: 'Optional limit to the number of output features.',
      default: 25
    }
  }
}
  fastify.route({
    method: 'GET',
    url: '/text-search/:table',
    schema: schema,
    handler: function (request, reply) {
      fastify.pg.connect(onConnect)

      function onConnect(err, client, release) {
        if(err) console.log(err)
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
             // console.log(sql(request.params, request.query))
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

module.exports.autoPrefix = '/v2'
