const recache = require("recache");

const _args = process.argv.slice(2);
const deployPath = _args[0] || '.';
const cacheRootFolderName = `${deployPath}${process.env.CACHE_FOLDER}` || 'tilecache';

module.exports = recache(cacheRootFolderName, {
  persistent: true,                           // Make persistent cache
  store: false                                 // Enable file content storage
}, (cache) => {
  console.log('mvt Cache ready!');
});

const { v4: uuidv4 } = require('uuid');


module.exports.CACHE_ID = uuidv4();