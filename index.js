const axios = require('axios');
const express = require('express')
const cors = require('cors');
const assert = require("assert");

const scrapers = require("./scrapers");

const port = process.env.JDANKS_PORT || 80;
const app = express()

const idToData = new Map();

const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 50 // limit each IP to 100 requests per windowMs
});

app.use(cors());
app.use(limiter);

app.get('/streams', async (req, res) => {
    console.info(`[${req.ip}] Requested /streams`);
    res.send(Array.from(idToData.values()));
})

app.get('/src', (req, res) => {
    res.send(`Copyright ${new Date().getFullYear()}, AGPLv3, https://github.com/jdanks-army/jdanks.armyd`)
});

const updatePeriod = 5 * 60 * 1000;

async function scrape(platform, id, name) {
    let data;

    if(!scrapers.has(platform))
        return console.error(`Platform ${platform} not supported (${id})!`);

    try {
        data = await scrapers.get(platform)(id, name);
    } catch (e) {
        console.error(`Couldn't scrape ${id} ${name ?? ""}: `, e.message);
    }
    data && idToData.set(id, data);
}

const loadPeople = (async (people) => {
    console.info("Populating scrape data...");

    // multithread all initial scrapes, wait for them all to finish
    await Promise.all(people.map(async (person, i) => {
        const platform = person[0];
        const id = person[1];

        await scrape(platform, id, person[2]);
        console.info(`Scraped ${id}!`);

        setTimeout(() => {
            setInterval(async () => {

                await scrape(platform, id, person[2]);
                console.info(`[${new Date().toTimeString().split(' ')[0]}] Rescraped ${id}`);

            }, updatePeriod);
        }, (updatePeriod / people.length) * i);
        // Split `updatePeriod` into equal periods, and then scrape every `updatePeriod`,
        // so that the scrapes are evenly distributed over the `updatePeriod`.
    }));

    console.info("Finished scraping everyone!")
});

const people = require('./people.json');
app.listen(port, async () => {
    console.log(`jdanks.armyd listening to 0.0.0.0:${port}`)
    await loadPeople(people);
});
