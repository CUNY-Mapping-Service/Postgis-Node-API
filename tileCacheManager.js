
const bcrypt = require('bcrypt');
const saltRounds = 10;

let hashedPassword = process.env.PASS_HASH;
const cliPWArray =  process.argv.filter(a=>a.includes('-PW'));
const cliPassword = cliPWArray.length === 0 ? null: cliPWArray[0].replace('-PW=','');
const bToMb = 1000000;
const MAX_MEGABYTE_SIZE = (process.env.MAX_TILE_CACHE_SIZE || 500) * bToMb;//mb times 1,000,000 = bytes
const memCache = {}

if(!hashedPassword && !cliPassword ){
    console.error('You need to set up a password for this deployment by running the server at least once with the -PW=[password] flag');
    process.exit(1);
}

async function createHash(_pass){
    const salt = await bcrypt.genSalt(saltRounds);
    const hash = await bcrypt.hash(_pass, salt)
    return hash
}

if(cliPassword){
    if(hashedPassword){
        console.error('A password has already been set. Delete the hashed password from the .env and run again');
        process.exit(1);
    }
    createHash(cliPassword).then((hashPass)=>{
        hashedPassword = hashPass;
        fs.appendFileSync('./.env', `\nPASS_HASH=${hashedPassword}`);
        console.log('Password set! Run the script again without the -PW flag');
        process.exit(0);
    })
}

  async function authenticate(_password){
   return await bcrypt.compare(_password,hashedPassword);
  }

  function addTile(_key, _mvt){
    memCache[_key] = _mvt;
  }

  function getCachedTile(_key){
    return memCache[_key] || false;
  }

  function clearPctOfCache(_pct){
    const _fract = _pct/100;
    let keys = Object.keys(memCache);
    let _len = keys.length;
    keys
    .splice(_len- Math.round(_len*_fract))
    .forEach((_key)=>{
      if(memCache[_key]){
        delete memCache[_key];
      }
    });
  }

  function manageLimit(){
    const limit = 2000;
    const pctPerRemoval = 25;
    const numCachedTiles = Object.keys(memCache).length;
    
    if(numCachedTiles > limit){ //TODO: Put limit, and delete amnt in .env!
      clearPctOfCache(pctPerRemoval);//TODO: put clear amount in .env
      console.log('cleared cache. tiles left: ',Object.keys(memCache).length)
    }else{
      console.log('cache is ',(numCachedTiles/limit)*100 + ' pct full' )
    }
  }


module.exports = {addTile, getCachedTile,authenticate,clearPctOfCache,manageLimit }