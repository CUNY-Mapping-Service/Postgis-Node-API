const qc = require("node-cache");
const queryCache = new qc();
// route query
const sql = (params, query) => {
  const [x, y, srid] = params.point.match(/^((-?\d+\.?\d+)(,-?\d+\.?\d+)(,[0-9]{4}))/)[0].split(',')
  let asGeojson = query.asGeojson === 'true';

  let tables = params.table.split(',');

  let selectStatement =  '';

 for(let t =0;t<tables.length;t++){

 let tableStatement = `
  SELECT 
    ${query.noGeom === 'true' ? '':`ST_Transform(${query.geom_column}, 4326) as geom`}
    ${query.withGeojson === 'true' ? `${query.noGeom === 'true' ? '':','} ST_asGeojson(ST_Transform(geom,4326)) as geojson, `:''}    
        ${query.columns ? `${query.noGeom === 'true'  ? '':','} ${query.columns}` : ''}
        ${query.noGeom === 'true' || query.columns ? ',':''} ${t} sortOrder
    
  FROM
    ${tables[t]}
  
  WHERE
    ST_DWithin(
      ${query.geom_column},      
      ST_Transform(
        st_setsrid(
          st_makepoint(${x}, ${y}), 
          ${srid}
        ),
        (SELECT ST_SRID(${query.geom_column}) FROM ${tables[t]} LIMIT 1)
      ),
      ${query.distance}
    )
    -- Optional Filter
    ${query.filter ? `AND ${query.filter}` : ''}

  -- Optional sort
  ${query.sort ? `ORDER BY ${query.sort}` : ''}

  -- Optional limit
  ${query.limit ? `LIMIT ${query.limit}` : ''}
  `

  if(asGeojson){
  	tableStatement = `SELECT
      ST_AsGeoJSON(subq.*, '', 4) AS geojson
    FROM (` + tableStatement + ` ) as subq`
  }

  selectStatement += tableStatement;

if(tables.length > 1){
  if(t<tables.length-1){

selectStatement+=`
UNION ALL
`
  }else{
  	selectStatement += 'ORDER BY sortOrder'
  }
}
}
  console.log(selectStatement)
  return selectStatement
}

// route schema
const schema = {
  description: 'Transform a point to a different coordinate system.',
  tags: ['api'],
  summary: 'transform point to new SRID',
  params: {
    table: {
      type: 'string',
      description: 'The name of the table or view.'
    },
    point: {
      type: 'string',
      pattern: '^((-?\\d+\\.?\\d+)(,-?\\d+\\.?\\d+)(,[0-9]{4}))',
      description: 'A point expressed as <em>X,Y,SRID</em>. Note for Lng/Lat coordinates, Lng is X and Lat is Y.'
    }
  },
  querystring: {
    geom_column: {
      type: 'string',
      description: 'The geometry column of the table.',
      default: 'geom'
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
    },
    asGeojson: {
      type: 'string',
      description: 'Set to true to return the entire response as geojson'
    },
    withGeojson: {
      type: 'string',
      description: 'Set to true to return the geometry ONLY as geojson'
    },
    noGeom:{
      type: 'string',
      description: 'DEPRICATED. Set to true to omit the raw geometry. Will still return geojson as column if withGeojson set to true.'
    }
  }
}

// create route
module.exports = function (fastify, opts, next) {
  fastify.route({
    method: 'GET',
    url: '/intersect_point/:table/:point',
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