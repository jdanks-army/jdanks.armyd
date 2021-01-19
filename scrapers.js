const fs = require("fs");
const scrapers = fs
    .readdirSync('./scrapers')
    .filter(f => f.endsWith('.js'))
    .map(x => require('./scrapers/' + x))
    .map(x => [x[0], (...args) => {
        let r = x[1](...args);
        r.platform = x[0];
        return r;
    }]);
module.exports = new Map(scrapers);
