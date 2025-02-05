const fs 		= require('fs');
const stringify = require("json-stringify-pretty-compact");
const bodyParser = require('body-parser');
const { dirname } = require('path');
const appDir = dirname(require.main.filename);

class ServerHandler {
	constructor(app, readOnly, path, serverPath) {
		const sPath = serverPath || "";
		const dataPath = path || `${appDir}/public/data`;
		const canWrite = readOnly ? 0 : 1;
		app.get(sPath + '/data/can-write.json', (req, res, next) => {
			res.json(canWrite);
		});

		app.get(sPath + '/data', (req, res, next) => {
			const { path } = req.query || {};
			const folder = dataPath;

			fs.readdir(folder, async (err, files) => {
				if (err) {
					res.status(400).send("Invalid request.");
					next(err);
					return;
				}
				const data = {};
				await files.forEach(async dir => {
					const dirPath = `${folder}/${dir}`;
					if (fs.lstatSync(dirPath).isDirectory()) {
						const dataFiles = fs.readdirSync(dirPath);
						dataFiles.forEach(jsonFile => {
							if (path && jsonFile.indexOf(path) < 0) {
								return;
							}
							const rawJson = fs.readFileSync(`${dirPath}/${jsonFile}`);
							try {
								const subData = JSON.parse(rawJson);
								data[`${dir}/${jsonFile}`] = subData;
							} catch (e) {
								console.error("Error on " + dirPath, e);
							}
						});
					}
				});
				res.json(data);
			});
		});

		if (canWrite) {
			function performWrite(data) {
			    for (let path in data) {
			    	if (!fs.existsSync(dirname(`${dataPath}/${path}`))) {
					    fs.mkdirSync(dirname(`${dataPath}/${path}`));
					}

			    	fs.writeFileSync(`${dataPath}/${path}`, stringify(data[path], null, "  "));
			    }
				return {success: true, updates: Object.keys(data).length};
			}

			app.post(sPath + '/data', bodyParser.json(), (req, res, next) => {
				res.json(performWrite(req.body));
			});

			app.get(sPath + '/set-data', (req, res, next) => {
				res.json(performWrite(req.query));
			});
		}
	}
}

module.exports = {
	ServerHandler,
}