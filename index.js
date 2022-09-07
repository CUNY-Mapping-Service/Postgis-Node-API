const path = require('path')
const config = require('./config')
const fastify = require('fastify')()
const fs = require("fs");

require('dotenv').config()

// const NodeCache = ;

config.swagger.basePath = config.swagger.basePath.replace('$title$', process.env.URL_PATH)
config.swagger.info.title = config.swagger.info.title.replace('$title$', process.env.TITLE)
config.swagger.info.description = config.swagger.info.description
  .replace('$title$', process.env.TITLE)
  .replace('$machine-db$', process.env.SERVER_DB)


const cacheFolder = process.env.CACHE_FOLDER || 'tilecache';
if (!fs.existsSync(cacheFolder)) {
  fs.mkdirSync(cacheFolder, { recursive: true });
}

// postgres connection
fastify.register(require('@fastify/postgres'), {
  connectionString: `${process.env.USER_PASSWORD}@${process.env.SERVER_PASSWORD}`
})

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
})

// routes
fastify.register(require('@fastify/autoload'), {
  dir: path.join(__dirname, 'routes')
})

// Launch server
fastify.listen(+process.env.PORT || 80, config.host || 'localhost', function (err, address) {
  if (err) {
    console.log(err)
    process.exit(1)
  }
  console.info(`Server listening on ${address}`)
})