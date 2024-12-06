const { v4: uuidv4 } = require('uuid');
const recache = require("recache");
const fs = require("fs-extra");
const bcrypt = require('bcrypt');
const saltRounds = 10;

// Uncomment to generate password on startup:
// async function createHash(_pass){
//     const salt = await bcrypt.genSalt(saltRounds);
//     const hash = await bcrypt.hash(_pass, salt)
//     return hash
// }

// createHash('cUnY2025!!').then((hash)=>{
//     console.log(hash) //COPY AND STORE THIS IN .ENV

// })

// THIS WILL COMPARE PASSWORD FROM API KEY:
// https://www.freecodecamp.org/news/how-to-hash-passwords-with-bcrypt-in-nodejs/
// bcrypt.compare('password123','example_hash.$2b$12bqDeKOkRdAqezZ.yGa9RGHunJyaseC.fPYQ3qIAA0$uKgd12DaY.f', (err, result) => {
//     if (err) {
//         // Handle error
//         console.error('Error comparing passwords:', err);
//         return;
//     }

// if (result) {
//     // Passwords match, authentication successful
//     console.log('Passwords match! User authenticated.');
// } else {
//     // Passwords don't match, authentication failed
//     console.log('Passwords do not match! Authentication failed.');
// }
// });

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

module.exports = { CACHE_ID,tileCache, readyState, wipeAndRestart }