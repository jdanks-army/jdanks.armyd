const fs = require("fs");
const files = fs.readdirSync('./scrapers');
const jsFiles = files.filter(f => f.endsWith('.js'));
const scrapers = jsFiles.map(x => require('./scrapers/' + x));
module.exports = new Map(scrapers);
