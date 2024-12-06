const { v4: uuidv4 } = require('uuid');
const recache = require("recache");
const fs = require("fs-extra");
const bcrypt = require('bcrypt');
const saltRounds = 10;

let hashedPassword = process.env.PASS_HASH;
const cliPWArray =  process.argv.filter(a=>a.includes('-PW'));
const cliPassword = cliPWArray.length === 0 ? null: cliPWArray[0].replace('-PW=','')

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

const CACHE_ID = uuidv4();
let readyState = false;

const _args = process.argv.slice(2);
const deployPath = _args[0] || '.';
const cacheRootFolderName = `${deployPath}${process.env.CACHE_FOLDER}` || 'tilecache';

let tileCache = recache(cacheRootFolderName, {
    persistent: false,                           // Make persistent cache
    store: false                                 // Enable file content storage
  }, (cache) => {
    console.log('mvt Cache ready!');
  });

  async function authenticate(_password){
   return await bcrypt.compare(_password,hashedPassword);
  }

 function wipeAndRestart(){
    tileCache.stop();
    readyState = false;
     try{
       const files = fs.readdirSync(cacheRootFolderName).map(f=>`${cacheRootFolderName}/${f}`)

           for(let f=0;f<files.length;f++){
             console.log(files[f])
             if(fs.existsSync(files[f])){
               console.log("deleting")
               fs.emptyDirSync(files[f])
               fs.rmdirSync(files[f])
             }else{
               console.log("doesn't exist")
             }
            
           }

       console.log('restart cache')
       tileCache.start();
     }catch(e){
       console.log(e)
     }
     
  }

module.exports = { CACHE_ID,tileCache, readyState, wipeAndRestart,authenticate }