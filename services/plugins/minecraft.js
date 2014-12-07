mcping = require('mcquery');
fs = require('fs');
pathlib = require('path');
glob = require('glob')
copyFolder = require('../create.js').copyFolder;
var properties = require ("properties");

var async = require('async');
var Gamedig = require('gamedig');
var settings = {};


settings.name = "Minecraft"
settings.stop_command = 'stop'
settings.started_trigger = ')! For help, type "help" or "?"'
settings.eula_trigger = 'Go to eula.txt for more info.'
settings.defaultvariables = {"-Djline.terminal=":"jline.UnsupportedTerminal", "-Xmx":"512M", "-jar":"minecraft_server.jar"}
settings.exe = "java",
settings.defaultPort = 25565;
settings.joined = ["-Xmx", "-XX:PermSize=", "-Djline.terminal="];

settings.query = function query(self) {
	ip = self.gamehost;
	port = parseInt(self.gameport);
	Gamedig.query(
	{
		type: 'minecraft',
		host: ip,
		port: port
	},
	function(res) {
		if(res.error) {
	  		self.emit('crash');
		}else{
			self.hostname 	= res['name'];
			self.numplayers = res['players'].length;
			self.maxplayers = res['maxplayers'];
			self.map        = res['map'];
			self.players    = res['players'];
			self.plugins	= res['raw']['plugins'];
			self.version	= res['raw']['version'];
			self.type		= res['raw']['type'];
			self.lastquerytime = new Date().getTime();
		}
	});
};

settings.commands = {
	'player':{
	'kick':'kick {{player}}',
	'ban':'ban {{player}}',
	'kill':'kill {{player}}',
	'clearinventory':'clearinventory {{player}}'
	}
};

settings.preflight = function(server){
	var jarPath = pathlib.join(server.config.path, server.config.variables['-jar']);

	if (!fs.existsSync(jarPath)){
	throw new Error("Jar doesn\'t exist : " + server.config.variables['-jar']);
	}
};

settings.install = function(server, callback){
	console.log("   Copying ...");
	try {

		if(typeof server.config.build.install_dir == 'undefined') {

			copyFolder(server, '/mnt/MC/CraftBukkit/', function(){ callback(); });

		} else {

			if(!fs.existsSync(server.config.build.install_dir)){

				copyFolder(server, '/mnt/MC/CraftBukkit/', function(){ callback(); });

			} else {

				copyFolder(server, server.config.build.install_dir, function(){ callback(); });

			}

		}

		console.log("   ... done");


	} catch(ex) {

		console.log("An error occured trying to copy over the files for the following server: "+ server.config.name);
		console.log(ex);

	}

};

settings.maplist = function maplist(self){
	maps = [];

	fs.readdirSync(self.config.path).forEach(function(directory){

		path = pathlib.join(self.config.path, directory);

		if (fs.lstatSync(path).isDirectory()){
	if (fs.existsSync(pathlib.join(path, "level.dat"))){
	  maps.push(directory)
	}
		}
	});

	return maps;
};

settings.configlist = function configlist(self){
	var configs = {};
	configs['core'] = [];

	glob("*.txt", {'cwd':self.config.path, 'sync':true}, function (er, files) {
	configs['core'] = configs['core'].concat(files);
	});

	if (fs.existsSync(pathlib.join(self.config.path, "server.properties"))){
	configs['core'] = configs['core'].concat("server.properties")
	}

	if (fs.existsSync(pathlib.join(self.config.path, "plugins"))){
	glob("plugins/*/*.yml", {'cwd':self.config.path, 'sync':true}, function (er, files) {
		configs['plugins'] = files;
	});
	}

	return configs;
};

settings.addonlist = function addonlist(self){
	var addons = {};

	if (fs.existsSync(pathlib.join(self.config.path, "plugins"))){
	glob("plugins/*.jar", {'cwd':self.config.path, 'sync':true}, function (er, files) {
		addons['bukkit'] = files;
	});
	}

	return addons;
};

	var bukget = require('bukget')({
		url: 'api.bukget.org/',
		version: 3,
		https: false,
		rejectUnauthorizedSSL: false,
		userAgent: 'GameTainers-GSD',
		localAddress : false,
		pluginServer: 'bukkit'
	});

settings.pluginsGetCategories = function plugincategories(self, callback){
	bukget.listPluginsCategories(function(err, results){
		results.forEach(function(entry) {
			entry.id = entry.name;
		});

		callback(err, results)
	});
};

settings.pluginsByCategory = function pluginsByCategory(self, category, size, start, callback){
	bukget.pluginsByCategories(category, {size:size, start:start, fields:"description,plugin_name,logo,server,website,versions.game_versions,versions.version,authors,versions.download"}, function(err, results){
		callback(err, results);
	});
};

settings.pluginsSearch = function pluginsSearch(self, name, size, start, callback){
	bukget.basicSearch({
		field: 'plugin_name',
		action: 'like',
		value: name,
		size: size,
		start:start,
		fields:"description,plugin_name,logo,server,website,versions.game_versions,versions.version,authors,versions.download"
	}, function(err, results){
		callback(err, results);
	});
};

module.exports = settings;
