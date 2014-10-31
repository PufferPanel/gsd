var ftpd = require('ftpd');
var config = require('../config.json');
var ftpconfig = config.interfaces.ftp;
var request = require('request');
var hasPermission = require('../auth.js').hasPermission;
var dotenv = require('dotenv');
dotenv.load();

String.prototype.rsplit = function(sep, maxsplit) {
    var split = this.split(sep);
    return maxsplit ? [ split.slice(0, -maxsplit).join(sep) ].concat(split.slice(-maxsplit)) : split;
};

if (process.env.KEY_FILE && process.env.CERT_FILE) {
  console.log('Running as FTPS server');
  if (process.env.KEY_FILE.charAt(0) !== '/') {
    keyFile = path.join(__dirname, process.env.KEY_FILE);
  }
  if (process.env.CERT_FILE.charAt(0) !== '/') {
    certFile = path.join(__dirname, process.env.CERT_FILE);
  }
  options.tls = {
    key: fs.readFileSync(keyFile),
    cert: fs.readFileSync(certFile),
    ca: !process.env.CA_FILES ? null : process.env.CA_FILES
      .split(':')
      .map(function (f) {
        return fs.readFileSync(f);
      })
  };
}
else {
  console.log();
  console.log('*** To run as FTPS server,                 ***');
  console.log('***  set "KEY_FILE", "CERT_FILE"           ***');
  console.log('***  and (optionally) "CA_FILES" env vars. ***');
  console.log();
}

var options = {
  pasvPortRangeStart: 4000,
  pasvPortRangeEnd: 5000,
  getInitialCwd: function(user) {
    return "/"
  },
  tlsOptions: options.tls,
  allowUnauthorizedTls: true,
  getRoot: function(connection) {
    split = connection.username.rsplit("-",1);
    username = split[0];
    serverId =  split[1];
    return config.servers[serverId].path;
  }
};

var server = new ftpd.FtpServer(ftpconfig.host, options);

server.on('error', function (error) {
  console.log('FTP Server error:', error);
});

server.on('client:connected', function(conn) {
  var username;
  var serverId;
  var fullUsername;
  console.log('Client connected from ' + conn.socket.remoteAddress);

  conn.on('command:user', function(user, success, failure) {
    if (user.indexOf("-") == -1){
        failure()
    }

    split = user.rsplit("-",1);
    username = split[0];
    serverId =  split[1];

    try {
        serverId = parseInt(serverId);
    }catch(ex){
        failure();
    }

    fullUsername = user;

    success()
  });

  conn.on('command:pass', function(pass, success, failure) {
      if (ftpconfig.authurl != null){
          request.post(ftpconfig.authurl, {form:{username:fullUsername, password:pass}}, function (error, response, body) {
              if (!error && response.statusCode == 200) {
                  try {
                      res = JSON.parse(body);
                      if (res.authkey != null){
                          if (hasPermission("ftp", res.authkey, serverId)){
                              success(username + "-" + serverId);
                          }else{
                              failure();
                          }
                      }else{
                          failure();
                      }
                  } catch (ex) {
                      failure();
                  }
              }else{
                  failure();
              }
          });
      }else{
          if (hasPermission("ftp", username, serverId)){
              success(username + "-" + serverId);
          }else{
              failure();
          }
      }
  });

});

server.listen(ftpconfig.port);
