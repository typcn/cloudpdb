const http = require('http');
const fs = require('fs');
const exec = require('child_process').exec;

const allowed_functions = {
  'MiEliminateZeroPages':1
}

let global_cache;

try{
  global_cache = JSON.parse(fs.readFileSync('globalcache.json').toString());
}catch(e){
  global_cache = {};
}

function saveGlobalCache(){
  fs.writeFileSync('globalcache.json',JSON.stringify(global_cache));
}

http.createServer(function (req, res) {
  try{
    if (req.method == 'GET') {
      let url = req.url.split('/');
      // The pdb file hash (pdb info and age of PE debug dict in hex format)
      // RtlStringCbPrintfW(pszDest, cbDest, L"PDBGUID%X", pdb_info->Age);
      let hash = url[1];
      let fname = url[2];
      let func = url[3];
      if(!hash || !fname || !func){
        throw new Error('Invalid arguments');
      }
      if(!allowed_functions[func]){
        res.writeHead(400, {'Content-Type': 'text/plain'});
        res.end('Function not allowed');
      }

      let file = 'pdbcache/' + hash + '_' + fname + '.pdb';

      if(global_cache[file+func]){
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end(global_cache[file+func]);
        return;
      }

      if (!fs.existsSync(file)) {
        let durl = 'http://msdl.microsoft.com/download/symbols/' + fname + '.pdb/' + hash + '/' + fname + '.pdb';
        downloadPdb(durl,file,()=>{
          parsePdb(file,func,res);
        });
      }else{
        parsePdb(file,func,res);
      }
    }else{
      res.writeHead(500, {'Content-Type': 'text/plain'});
      res.end('创死我了，，，');
    }
  }catch(e){
    res.writeHead(500, {'Content-Type': 'text/plain'});
    res.end(e.message);
  }
}).listen(18083);



function downloadPdb(url,file,cb){
  let fst = fs.createWriteStream(file);
  http.get(url, function(response) {
    response.pipe(fst);
    fst.on('finish', function() {
      fst.close(cb);
    });
  });
}


function parsePdb(file,func,res){
  exec('./pdbget ' + file + ' ' + func, function(error, stdout, stderr) {
    if(error || !stdout || stdout.length){
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end('Not found');
    }
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end(stdout);
    global_cache[file+func] = stdout;
    saveGlobalCache();
  });
}
