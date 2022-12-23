const recache = require("recache")
const fs = require("fs");

const _args = process.argv.slice(2);
const deployPath = _args[0] || '.';

const cacheRootFolderName = `${deployPath}${process.env.CACHE_FOLDER}` || 'tilecache';

const cache = recache(cacheRootFolderName, {
  persistent: true,                           // Make persistent cache
  store: true                                 // Enable file content storage
}, (cache) => {
  console.log('mvt Cache ready!');

  // cache.read(...);
});

// route query
const sql = (params, query) => {
  return `
    WITH mvtgeom as (
      SELECT
        ST_AsMVTGeom (
          ST_Transform(${query.geom_column}, 3857),
          ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
        ) as geom
        ${query.columns ? `, ${query.columns}` : ''}
        ${query.id_column ? `, ${query.id_column}` : ''}
      FROM
        ${params.table},
        (SELECT ST_SRID(${query.geom_column}) AS srid FROM ${params.table} WHERE ${query.geom_column} IS NOT NULL LIMIT 1) a
      WHERE
        ST_Intersects(
          ${query.geom_column},
          ST_Transform(
            ST_TileEnvelope(${params.z}, ${params.x}, ${params.y}),
            srid
          )
        )

        -- Optional Filter
        ${query.filter ? ` AND ${query.filter}` : ''}
    )
    SELECT ST_AsMVT(mvtgeom.*, '${params.table}', 4096, 'geom' ${
    query.id_column ? `, '${query.id_column}'` : ''
  }) AS mvt from mvtgeom;
  `
}

// route schema
const schema = {
  description:
    'Return table as Mapbox Vector Tile (MVT). The layer name returned is the name of the table.',
  tags: ['feature'],
  summary: 'return MVT',
  params: {
    table: {
      type: 'string',
      description: 'The name of the table or view.'
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
        'Optional columns to return with MVT. The default is no columns.'
    },
    id_column: {
      type: 'string',
      description:
        'Optional id column name to be used with Mapbox GL Feature State. This column must be an integer a string cast as an integer.'
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
    url: '/mvt/:table/:z/:x/:y',
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

        const p = request.params;
        const geom_column = request.query.geom_column
        const tilePathRoot = `<root>/${p.table}-${geom_column}/${p.z}/${p.x}/${p.y}.mvt`
        const tilePathRel = `${cacheRootFolderName}/${p.table}-${geom_column}/${p.z}/${p.x}/${p.y}.mvt`
        const tileFolder = `${cacheRootFolderName}/${p.table}-${geom_column}/${p.z}/${p.x}`

        if (cache.has(tilePathRoot) && (!request.query.useCache || request.query.useCache==='true')) {
          //console.log(`cache hit: ${tilePathRel} \r\n`)
          const mvt = cache.get(tilePathRoot).content;
          release()
          reply.headers({'Content-Type': 'application/x-protobuf','cached-tile':'true'}).send(mvt)

        } else {
          console.log(`cache miss: ${tilePathRel} \r\n`)
           console.log(sql(request.params, request.query))
          client.query(sql(request.params, request.query), function onResult(
            err,
            result
          ) {
            release()
            if (err) {
              reply.send(err)
            } else {
              const mvt = result.rows[0].mvt;
              //console.log(mvt.length, '\r\n')
              if (mvt.length === 0) {
                 if (!fs.existsSync(tileFolder)) {
                  console.log('making empty folder')
                    fs.mkdir(tileFolder, { recursive: true },function(err){
                      console.log(err)
                    });
                  }
                   fs.open(tilePathRel, 'w', function (err) {
                    if (err) {
                      return console.log(err);
                    }
                  });
                reply.code(204)
              } else {
              	//console.log(`saving: ${tilePathRel} \r\n`);
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
                }catch(e){
                  console.log(e);
                  console.log('\r\n')
                }
              }
              reply.headers({'Content-Type': 'application/x-protobuf','cached-tile':'false'}).send(mvt)
            }
          })
        }
      }
    }
  })
  next()
}

module.exports.autoPrefix = '/v1'
