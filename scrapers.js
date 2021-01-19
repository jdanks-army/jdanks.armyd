const fs = require("fs");
const scrapers = fs
    .readdirSync('./scrapers')
    .filter(f => f.endsWith('.js'))
    .map(x => require('./scrapers/' + x))
    .map(x => [x[0], async (...args) => {
        let r = await x[1](...args);
        r.platform = x[0];
        if(!r.live) {
            delete r.viewers;
            delete r.title;
        }
        return r;
    }]);
module.exports = new Map(scrapers);
