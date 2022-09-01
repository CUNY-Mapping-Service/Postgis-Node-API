const recache = require("recache")
const fs = require("fs");
const cacheRootFolderName = process.env.CACHE_FOLDER || 'tilecache';

const cache = recache(cacheRootFolderName, {
  persistent: true,                           // Make persistent cache
  store: true                                 // Enable file content storage
}, (cache) => {
  console.log('layered-mvt Cache ready!');

  // cache.read(...);
});

// route query
const sql = (params, query) => {
  //console.log(params)
  let q = 'SELECT '
  let tables = params.tables.split(',');


  tables.forEach((table, idx) => {
    q += `
      (
        SELECT ST_AsMVT(tile, '${table}', 4096, 'geom') AS tile
        FROM (
            SELECT ST_AsMVTGeom(geom, ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})) AS geom ${query.columns ? `, ${query.columns}` : ''}
            FROM ${params.schema || 'public'}.${table}
        ) tile
        WHERE tile.geom IS NOT NULL 
    )
    ${idx < tables.length - 1 ? '||' : 'as mvt'}
    `


  })
  //${table.includes('label') ? ' , distname' :''}
  // `
  //   WITH mvtgeom as (
  //     SELECT
  //       ST_AsMVTGeom (
  //         ST_Transform(${query.geom_column}, 3857),
  //         ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
  //       ) as geom
  //       ${query.columns ? `, ${query.columns}` : ''}
  //       ${query.id_column ? `, ${query.id_column}` : ''}
  //     FROM
  //       public."${params.table}",
  //       (SELECT ST_SRID(${query.geom_column}) AS srid FROM "${params.table}" LIMIT 1) a
  //     WHERE
  //       ST_Intersects(
  //         geom,
  //         ST_Transform(
  //           ST_TileEnvelope(${params.z}, ${params.x}, ${params.y}),
  //           srid
  //         )
  //       )

  //       -- Optional Filter
  //       ${query.filter ? ` AND ${query.filter}` : ''}
  //   )
  //   SELECT ST_AsMVT(mvtgeom.*, '${params.table}', 4096, 'geom' ${
  //   query.id_column ? `, '${query.id_column}'` : ''
  // }) AS mvt from mvtgeom;
  // `

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
    tables: {
      type: 'string',
      description: 'The name of the tables or views.'
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
    url: '/mvt_layered/:schema/:tables/:z/:x/:y',
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

        const tilePathRoot = `<root>/${p.tables.replace(',', '-')}/${p.z}/${p.x}/${p.y}.mvt`
        const tilePathRel = `${cacheRootFolderName}/${p.tables.replace(',', '-')}/${p.z}/${p.x}/${p.y}.mvt`
        const tileFolder = `${cacheRootFolderName}/${p.tables.replace(',', '-')}/${p.z}/${p.x}`

        if (cache.has(tilePathRoot)) {
          console.log(`cache hit: ${tilePathRel}`)
          const mvt = cache.get(tilePathRoot).content;
            release()
          reply.header('Content-Type', 'application/x-protobuf').send(mvt)
        } else {
          console.log(`cache miss: ${tilePathRel}`)
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
              reply.header('Content-Type', 'application/x-protobuf').send(mvt)

            }
          })
        }
      }
    }
  })
  next()
}

module.exports.autoPrefix = '/v1'
