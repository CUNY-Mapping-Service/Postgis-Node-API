
const fs = require("fs-extra");
const fastFolderSizeSync = require('fast-folder-size/sync')
const cacheManager = require("../tileCacheManager");
// create route
module.exports = function (fastify, opts, next) {

 
  const _args = process.argv.slice(2);
  const deployPath = _args[0] || '.';
  const cacheRootFolderName = `${deployPath}${process.env.CACHE_FOLDER}` || 'tilecache';

  let tileCache = cacheManager.tileCache;
  const cacheID=cacheManager.CACHE_ID

  const bToMb = 1000000;
  const MAX_MEGABYTE_SIZE = (process.env.MAX_TILE_CACHE_SIZE || 500) * bToMb;//mb times 1,000,000 = bytes

  tileCache.on("ready",()=>{
    console.log('ready again')
    cacheManager.readyState = true;
  })
  function checkCache(){
    const bytes = fastFolderSizeSync(cacheRootFolderName)
    console.log('cache fullness: ',(bytes/MAX_MEGABYTE_SIZE)*100,"%")

    if(bytes > MAX_MEGABYTE_SIZE){
        console.log('delete cache')
        cacheManager.wipeAndRestart();
      }
  }

  const sql = (params, query) => {

    let simplifyStatement;
    let simplifyMultiplier = query.simplifyByZoom ? +params.z : 1;
  
    if (query.simplify && query.simplify > 0) {
      simplifyStatement = `ST_Simplify(ST_Transform(${query.geom_column}, 3857),${+query.simplify * +simplifyMultiplier})`
    }
  
    return `
      WITH mvtgeom as (
        SELECT
          ST_AsMVTGeom (
            ${simplifyStatement || `ST_Transform(${query.geom_column}, 3857)`},
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
      SELECT ST_AsMVT(mvtgeom.*, '${params.table}', 4096, 'geom' ${query.id_column ? `, '${query.id_column}'` : ''
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
      },
      simplify: {
        type: 'string',
        description: 'Simplify threshold using ST_Simplify'
      },
      simplifyByZoom: {
        type: 'string',
        description: 'Should the threshold be multiplied by zoom level'
      },
      useCache: {
        type: 'string',
        description: 'Should the cache be used'
      }
    }
  }

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
        const q = request.query;
        const geom_column = request.query.geom_column;
        
        const cols = Object.values(q).join(',').split(',').map(k=>k[0]).join('');
          
        const tilePathRoot = `<root>/${p.table}-${geom_column}-${cols}-${cacheID}/${p.z}/${p.x}/${p.y}.mvt`
        const tilePathRel = `${cacheRootFolderName}/${p.table}-${geom_column}-${cols}-${cacheID}/${p.z}/${p.x}/${p.y}.mvt`
        const tileFolder = `${cacheRootFolderName}/${p.table}-${geom_column}-${cols}-${cacheID}/${p.z}/${p.x}`

        console.log('ready: ', cacheManager.readyState)
        if ( cacheManager.readyState && tileCache.has(tilePathRoot) && (!request.query.useCache || request.query.useCache === 'true')) {
          console.log('cached mvt')
          const mvt = fs.readFileSync(tilePathRel);

          release()
          reply
          .headers({ 'Content-Type': 'application/x-protobuf', 'cached-tile': 'true' })
          .send(mvt);    

        } else {
          client.query(sql(request.params, request.query), function onResult(
            err,
            result
          ) {
            release()
            if (err) {
              reply.send(err)
            } else {
              const mvt = result.rows[0].mvt;
              if (mvt.length === 0) {
                if (!fs.existsSync(tileFolder) &&  cacheManager.readyState) {
                  fs.mkdir(tileFolder, { recursive: true }, function (err) {
                    console.log(err)
                  });
                }
          
                reply.code(204)
              } else {
                try {
                  if( cacheManager.readyState){
                  if (!fs.existsSync(tileFolder)) {
                    fs.mkdirSync(tileFolder, { recursive: true });
                  }
                  //Save mvt file from rows in tilecache
                  fs.writeFileSync(tilePathRel, mvt, function (err) {
                    if (err) {
                      return console.log(err);
                    }
                  });
                }
                } catch (e) {
                  console.log(e);
                  console.log('\r\n')
                }
              }
              reply.headers({ 'Content-Type': 'application/x-protobuf', 'cached-tile': 'false' }).send(mvt)
              if( cacheManager.readyState){
                checkCache(tileCache)
              }
            }
          })
        }
      }
    }
  })
  next()
}

module.exports.autoPrefix = '/v1'
