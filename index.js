const axios = require('axios');
const express = require('express')
const cors = require('cors');
const { parse } = require('node-html-parser');

const port = process.env.JDANKS_PORT || 3009;
const app = express()

const idToData = new Map();

async function youtube(id) {
    const {data} = await axios.get(`https://youtube.com/channel/${id}`);

    const avatar = data.match(/channelMetadataRenderer.*?avatar.*?thumbnails.*?url".*?"(.*?)"/s)[1];
    const name = data.match(/channelMetadataRenderer.*?title".*?"(.*?)"/s)[1];

    const {data: livedata} = await axios.get(`https://youtube.com/channel/${id}/live`);
    let live, title;
    try {
        title = livedata.match(/videoPrimaryInfoRenderer".*?"title".*?"runs".*?"text".*?"(.*?)"/s)[1];
        live = livedata.match(/playabilityStatus.*?status".*?"(.*?)"/s)[1] !== "LIVE_STREAM_OFFLINE";
    } catch (e) {
        live = false;
    }

    let r = {
        avatar,
        name,
        live,
        id,
        platform: 'youtube',
    }

    if (live) {
        r.title = title;
        let viewers = livedata.match(/videoPrimaryInfoRenderer".*?"viewCount".*?"runs".*?"text".*?"(.*?)"/s)[1]?.split(' ')[0];
        r.viewers = Number(viewers.replace(/[.,]/g, ""));
    }

    return r;
}

async function dlive(id) {
    const { data } = await axios.post('https://graphigo.prd.dlive.tv/',
        `{"query":"query{userByDisplayName(displayname: \\"${id}\\") {livestream{ view title } avatar}}"}`);

    const response = data.data.userByDisplayName;
    const live = !!response.livestream;

    let r = {
        platform: "dlive",
        id, name: id,
        avatar: response.avatar,
        live,
    }

    if(live) {
        r.viewers = response.livestream.view;
        r.title = response.livestream.title;
    }

    return r;
}

async function bitwave(id) {
    const {data: _data} = await axios.get(`https://api.bitwave.tv/v1/channels/${id}`);
    if(!_data?.success) return {};
    const data = _data.data;
    return {
        live: data.live,
        name: data.name,
        avatar: data.avatar,
        id,
        platform: "bitwave",
        viewers: data.viewCount,
        title: data.title,
    };
}

async function robotstreamer(id) {
    const {data} = axios.get(`https://robotstreamer.com/robot/${id}`);
}

const scrapers = new Map([
    ["youtube", youtube],
    ["dlive", dlive],
    ["bitwave", bitwave],
]);

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

async function scrape(platform, id) {
    let data;
    if(!scrapers.has(platform)) {
        console.error(`Platform ${platform} not supported (${id})!`);
        return;
    }
    try {
        data = await scrapers.get(platform)(id);
    } catch (e) {
        console.error(`Couldn't scrape ${id}: `, e.message);
    }
    data && idToData.set(id, data);
}

const loadPeople = (async (people) => {
    console.info("Populating scrape data...");

    // multithread all initial scrapes, wait for them all to finish
    await Promise.all(people.map(async (person, i) => {
        const platform = person[0];
        const id = person[1];

        scrape(platform, id);
        console.info(`Scraped ${id}!`);

        setTimeout(() => {
            setInterval(async () => {

                scrape(platform, id);
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
