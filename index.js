const path = require('path')
const config = require('./config')
const fastify = require('fastify')()
const fs = require("fs-extra");

const _args = process.argv.slice(2);
const deployPath = _args[0] || '';

console.log('deploy folder: ',deployPath)

require('dotenv').config({path:`${deployPath}.env`});

config.swagger.basePath = config.swagger.basePath.replace('$title$', process.env.URL_PATH)
config.swagger.info.title = config.swagger.info.title.replace('$title$', process.env.TITLE)
config.swagger.info.description = config.swagger.info.description
  .replace('$title$', process.env.TITLE)
  .replace('$machine-db$', process.env.SERVER_DB)

  console.log(process.env)


const cacheFolder =`${deployPath}${process.env.CACHE_FOLDER}` || `${deployPath}tilecache`;
console.log('folder set to: ',cacheFolder);

if (!fs.existsSync(cacheFolder)) {
  console.log('creating folder: ',cacheFolder)
  fs.mkdirSync(cacheFolder, { recursive: true });
}

if(process.env.LOG==='FALSE'){
  console.log=()=>{}
}

// postgres connection
fastify.register(require('@fastify/postgres'), {
  connectionString: `${process.env.USER_PASSWORD}@${process.env.SERVER_DB}`
  //egconnectionString: "postgres://application:cuny2o2!@wa14bv/us_redistricting"
})

console.log(`connecting to: ${process.env.USER_PASSWORD}@${process.env.SERVER_DB}`)

fastify.register(
  require('@fastify/compress'), {
    customTypes: /^text\/|\+json$|\+text$|\+xml|x-protobuf$/
  }
)

// cache
fastify.register(
  require('@fastify/caching'), {
  privacy: 'private',
  expiresIn: 900,
  serverExpiresIn:900
}
)

// CORS
fastify.register(require('@fastify/cors'))

// swagger
fastify.register(require('@fastify/swagger'), {
  exposeRoute: true,
  swagger: config.swagger
})

// static documentation path
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public')
});

// routes
fastify.register(require('@fastify/autoload'), {
  dir: path.join(__dirname, 'routes')
})

if(process.env.APP_SPECIFIC_ROUTES){
  fastify.register(require('@fastify/autoload'), {
    dir: path.join(__dirname, `app_specific_routes/${process.env.APP_SPECIFIC_ROUTES}`)
  })
}

//TODO: These should be handled like APP_SPECIFIC_ROUTES but not sure if removing this would break IMAGE
// if(process.env.CUSTOM_ROUTES){
//   fastify.register(require('@fastify/autoload'), {
//     dir: path.join(__dirname, 'routes')
//   })
// }

// Launch server
fastify.listen({port:+process.env.PORT || 80, host:config.host || '0.0.0.0'}, function (err, address) {
  if (err) {
    console.log(err)
    process.exit(1)
  }
  console.info(`Server listening on ${address}`)
})