const qc = require("node-cache");


module.exports = function (fastify, opts, next) {
  const queryCache = new qc();
// route query
const sql = (props) => {
  let tableStatement = `
  SELECT  ST_Transform(${props.geom_column}, 4326) as geom, ${props.columns} FROM ${props.table} t WHERE ST_Intersects(ST_Transform(${props.geom_column}, 4326), ST_GeomFromGeoJSON('${props.inputGeom}'))
  `
let selectStatement = "";

if(props.asGeojson){
    tableStatement = `SELECT
      ST_AsGeoJSON(subq.*) AS geojson
    FROM (` + tableStatement + ` ) as subq`
  }

  selectStatement += tableStatement;
 // console.log(selectStatement)
  return selectStatement;
}

const schema = {
    body: {
      type: 'object',
      properties: {
        table: {
        type: 'string',
        description: 'Table to use as an overlay.'
      },
      geom_column: {
        type: 'string',
        description: 'The geometry column of the from_table. The default is geom.',
        default: 'geom'
      },
       inputGeom: {
        type: 'string',
        description: 'input geometry to set the buffer'
      },
      asGeojson: {
        type: 'string',
        description: 'Set to true to return geojson'
      },
      columns: {
        type: 'string',
        description: 'Columns to return. Columns should be prefaced by the table name if the column name exists in both tables (ex: f.pid, t.prkname). The default is all columns.',
        default: '*'
      },
      distance: {
        type: 'integer',
        description: 'Buffer the overlay feature(s) by units of the geometry column.',
        default: 0
      }
      },
     // required: ['name']
    }
  }
  console.log('create ifb')
fastify.route({
  method: 'POST',
  url: '/intersect-feature-buffer',
  schema: schema,
  handler: (request, reply) => {
    fastify.pg.connect(onConnect)
   // const { table, geom_column, inputGeom, columns, distance } = request.body;
    console.log('handle ifb post')
    function onConnect(err, client, release) {
        if (err) return reply.send({
          "statusCode": 500,
          "error": "Internal Server Error",
          "message": "unable to connect to database server"
        });

    client.query(
            sql(request.body),
            function onResult(err, result) {
              release()
              
              if (result && typeof result !== 'undefined' && result.rows){
                //console.log(result.rows)
                reply.send(result.rows)
                //queryCache.set(key, result.rows, 900)
              }

              if(err) {
                reply.send(err); 
              }
            }
          );
  }

    // reply.code(200).send({
    //   message: `Hello ${name}!`
    // })
  }
})
next();
}


module.exports.autoPrefix = '/v1'