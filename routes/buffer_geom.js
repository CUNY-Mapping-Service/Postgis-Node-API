const qc = require("node-cache");
const queryCache = new qc();
// route query
const sql = (params, query) => {
 
  //select ST_Buffer((select geom from dhs_taxparcel dt where bbl_txt='4037060014'),805)
  
let selectStatement = "";
const distances = query.distance.split(',').map(d=>+d);

for(let d = 0; d<distances.length;d++){
  //selectStatement+=`select ST_Transform(ST_Buffer((select ${query.geom_column} from ${params.table} dt where ${query.filter}),${distances[d]},'quad_segs=16'),4326)`;
  selectStatement+=`select st_transform(ST_Buffer(st_transform((select ${query.geom_column || 'geom'} from ${params.table} where ${query.filter}),2263),${distances[d]}),4326)`
  if(d<distances.length -1){
    selectStatement += ' union '
  }
}
//select ST_Buffer((select geom from dhs_taxparcel dt where bbl_txt='4037060014'),805)
if(query.asGeojson){
  	selectStatement = `SELECT
      ST_AsGeoJSON(subq.*) AS geojson
    FROM (` + selectStatement + ` ) as subq`
  }

  return selectStatement;
}

const schema = {
  description: 'Return buffered geometry from a table or view',
  tags: ['api'],
  summary: 'feature(s) buffer(s)',
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
    filter: {
      type: 'string',
      description: 'Optional filter parameters for a SQL WHERE statement.'
    },
    distance:{
      type: 'string',
      description: 'Distance in meters to buffer. Separate multiple distances by commas'
    },
     asGeojson: {
        type: 'string',
        description: 'Set to true to return geojson'
      },
  }
}

// create route
module.exports = function (fastify, opts, next) {
  fastify.route({
    method: 'GET',
    url: '/buffer_geom/:table',
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