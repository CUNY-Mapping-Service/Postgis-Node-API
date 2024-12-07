const fs = require("fs-extra");
const bcrypt = require('bcrypt');
const saltRounds = 10;

let hashedPassword = process.env.PASS_HASH;
const cliPWArray =  process.argv.filter(a=>a.includes('-PW'));
const cliPassword = cliPWArray.length === 0 ? null: cliPWArray[0].replace('-PW=','');
const tileList = [];

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

let readyState = true;

const _args = process.argv.slice(2);
const deployPath = _args[0] || '.';
const cacheRootFolderName = `${deployPath}${process.env.CACHE_FOLDER}` || 'tilecache';


  async function authenticate(_password){
   return await bcrypt.compare(_password,hashedPassword);
  }

  function checkDisk(_tilePath){
    return tileList.indexOf(_tilePath) > -1;
  }

  function addTile(_tilePath){
    tileList.push(_tilePath);
  }

 function wipeAndRestart(){
   
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
           tileList.length = 0;
       console.log('restart cache')
      
     }catch(e){
       console.log(e)
     }
     
  }

module.exports = {addTile, checkDisk, readyState, wipeAndRestart,authenticate }