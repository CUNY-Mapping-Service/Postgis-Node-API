const path = require('path')
const config = require('./config')
const fastify = require('fastify')()
const fs = require("fs-extra");

const _args = process.argv.slice(2);
const deployPath = _args[0] || '';

console.log('deploy folder: ',deployPath)

require('dotenv').config({path:`${deployPath}.env`});

// const NodeCache = ;

if(_args[1] && _args[1]==='-test'){
  console.log('TESTING ENVIRONMENT')
  config.swagger.basePath = config.swagger.basePath.replace('$title$', '')
}else{
  config.swagger.basePath = config.swagger.basePath.replace('$title$', process.env.URL_PATH)
}

config.swagger.info.title = config.swagger.info.title.replace('$title$', process.env.TITLE)
config.swagger.info.description = config.swagger.info.description
  .replace('$title$', process.env.TITLE)
  .replace('$machine-db$', process.env.SERVER_DB)


const cacheFolder =`${deployPath}${process.env.CACHE_FOLDER}` || `${deployPath}tilecache`;
console.log('folder set to: ',cacheFolder)

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
  //connectionString: "postgres://application:cuny2o2!@wa14bv/us_redistricting"
})

console.log(`connecting to: ${process.env.USER_PASSWORD}@${process.env.SERVER_DB}`)

// compression - add x-protobuf
fastify.register(
  require('@fastify/compress'), {
  customTypes: /^text\/|\+json$|\+text$|\+xml|x-protobuf$/
}
)

// cache
fastify.register(
  require('@fastify/caching'), {
  privacy: 'private',
  expiresIn: config.cache
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
  root: path.join(__dirname, 'documentation')
});



// routes
fastify.register(require('@fastify/autoload'), {
  dir: path.join(__dirname, 'routes')
})

// Launch server
fastify.listen({port:+process.env.PORT || 80, host:config.host || 'localhost'}, function (err, address) {
  if (err) {
    console.log(err)
    process.exit(1)
  }
  console.info(`Server listening on ${address}`)
})