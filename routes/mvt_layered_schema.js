const recache = require("recache")
const fs = require("fs");

const _args = process.argv.slice(2);
const deployPath = _args[0] || '.';

const cacheRootFolderName = `${deployPath}${process.env.CACHE_FOLDER}` || 'tilecache';

let tableNames = {}
let columnNames = {}
const cache = recache(cacheRootFolderName, {
  persistent: true,                           // Make persistent cache
  store: true                                 // Enable file content storage
}, (cache) => {
  //console.log('layered-mvt Cache ready!');

  // cache.read(...);
});

const qc = require("node-cache");
const queryCache = new qc();

// create route
module.exports = function (fastify, opts, next) {
  fastify.route({
    method: 'GET',
    url: '/mvt_layered_schema/:schema/:z/:x/:y',
    schema: schema,
    handler: function (request, reply) {
      const p = request.params;
      fastify.pg.connect((err, client, release) => {
        if (err) {
          return reply.send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'unable to connect to database server'
          })
        }

        const key = 'table-list-' + request.params.schema;

        const cachedResp = queryCache.get(key);

        if (typeof cachedResp !== 'undefined') {
          tableNames[request.params.schema] = cachedResp;
         // console.log('DO NOT need to request tables and columns')

          fastify.pg.connect(makeMVTRequest)
          release()
        } else {
         // console.log('need to request tables and columns')
          makeTableRequest(client,request);
        }



        function makeTableRequest(client,request){
          client.query(tableNameQuery(request.params, request.query), function onResult(
            err,
            result
          ) {
            if (err) {
              reply.send(err)
            } else {
              tableNames[p.schema] = result.rows.map(t => t.table_name);
              queryCache.set(key, tableNames[p.schema], 60)
              makeColumnRequest(client, request);
            }
          })
        }

        function makeColumnRequest(client, request) {
          client.query(columnNamesQuery(request.params, request.query), function onResult(
            err,
            _result
          ) {
            if (err) {
              reply.send(err)
            } else {
              _result.rows.forEach((r) => {
                columnNames[r.table_name] = columnNames[r.table_name] || []
                if (r.column_name !== 'geom') {
                  columnNames[r.table_name].push(r.column_name)
                }
              })
              
              fastify.pg.connect(makeMVTRequest)
              release()
            }
          })
        }

        function makeMVTRequest(err, client, release) {
          if (err) {
            return reply.send({
              statusCode: 500,
              error: 'Internal Server Error',
              message: 'unable to connect to database server'
            })
          }
          const p = request.params;

          const tilePathRoot = `<root>/${p.schema}-schema-${request.query.columns || 'all'}/${p.z}/${p.x}/${p.y}.mvt`
          const tilePathRel = `${cacheRootFolderName}/${p.schema}-schema-${request.query.columns || 'all'}/${p.z}/${p.x}/${p.y}.mvt`
          const tileFolder = `${cacheRootFolderName}/${p.schema}-schema-${request.query.columns || 'all'}/${p.z}/${p.x}`

          if (cache.has(tilePathRoot)) {
            ////console.log(`cache hit: ${tilePathRel}`)
            const mvt = cache.get(tilePathRoot).content;
            release()
            reply.header('Content-Type', 'application/x-protobuf').send(mvt)
          } else {
            //console.log(`cache miss: ${tilePathRel}`)
            client.query(sql(request.params, request.query), function onResult(
              err,
              result
            ) {
              release()
              if (err) {
                reply.send(err)
              } else {
                const mvt = result.rows[0].mvt
                if (mvt.length === 0) {
                  // console.log('nothing here')
                  reply.code(204)
                } else {
                  try {
                    if (!fs.existsSync(tileFolder)) {
                      fs.mkdirSync(tileFolder, { recursive: true });
                    }
                    //Save mvt file from rows in tilecache
                    fs.writeFile(tilePathRel, mvt, function (err) {
                      if (err) {
                        return console.log(err);
                      }
                    });
                  } catch (e) {
                    console.error(e)
                  }
                }
                //console.log(mvt)
                reply.header('Content-Type', 'application/x-protobuf').send(mvt)

              }
            })
          }
        }

      })
    }
  })
  next()
}

module.exports.autoPrefix = '/v1'

const tableNameQuery = (params, query) => {
  return `
  SELECT
    i.table_name
  FROM
    information_schema.tables i
  WHERE
    i.table_schema not in  ('pg_catalog', 'information_schema')
    and i.table_schema='${params.schema}'
    -- Optional where filter
    

  ORDER BY table_name
  `
}

const columnNamesQuery = (params, query) => {
  // console.log(params)
  return `
  SELECT
  i.table_name,
  i.column_name
  FROM
    information_schema.columns i
  WHERE
    i.table_schema not in  ('pg_catalog', 'information_schema')
    and i.table_schema='${params.schema}'
    -- Optional where filter
    

  ORDER BY table_name
  `
}


// route query
const sql = (params, query) => {
  //console.log(params)
  let q = 'SELECT '
  let tables = tableNames[params.schema]//params.tables.split(',');


  
  //console.log(cols)
  tables.forEach((table, idx) => {

    let cols = query.columns.split(',').map(c=>`'${c}'`).join(',') || columnNames[table].join(',');
    
    q += `
      (
        SELECT ST_AsMVT(tile, '${table}', 4096, 'geom') AS tile
        FROM (
            SELECT ST_AsMVTGeom(${query.geom_column || 'geom'}, ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})) AS geom, ${cols}
            FROM ${params.schema || 'public'}.${table}
        ) tile
        WHERE tile.geom IS NOT NULL 
    )
    ${idx < tables.length - 1 ? '||' : 'as mvt'}
    `


  })
  return q
}
// route schema
const schema = {
  description:
    'Return MULTIPLE tables as multi-layer Mapbox Vector Tile (MVT).',
  tags: ['feature'],
  summary: 'return MVT',
  params: {
    schema: {
      type: 'string',
      description: 'The name of the schema.'
    },
    z: {
      type: 'integer',
      description: 'Z value of ZXY tile.'
    },
    x: {
      type: 'integer',
      description: 'X value of ZXY tile.'
    },
    y: {
      type: 'integer',
      description: 'Y value of ZXY tile.'
    }
  },
  querystring: {
    geom_column: {
      type: 'string',
      description: 'Optional geometry column of the table. The default is geom.',
      default: 'geom'
    },
    columns: {
      type: 'string',
      description:
        'Optional columns to return with MVT. The default is ALL columns except geom.'
    }
  }
}