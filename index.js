const axios = require('axios');
const express = require('express')
const cors = require('cors');
const assert = require("assert");

const port = process.env.JDANKS_PORT || 80;
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

async function robotstreamer(id, name) {
    const {data: _data} = await axios.get(`http://api.robotstreamer.com:8080/v1/get_robot/${id}`);
    const data = _data[0];
    const live = data.status === "online";
    const title = data.robot_name;
    const viewers = data.viewers;
    return {
        live, name, id,
        platform: "robotstreamer",
        title, viewers
    }
}

const trovo_id_memoization = new Map();
async function trovo(username) {
    const token = process.env.TROVO_CLIENT_ID;

    assert( !!token );

    if( !trovo_id_memoization.has(username) ) {
        const {data} = await axios.post(
            'https://open-api.trovo.live/openplatform/getusers',
            {user: [username]},
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Client-ID': token,
                }
            }
        );
        trovo_id_memoization.set(username, data.users[0].channel_id );
    }

    assert(trovo_id_memoization.has(username));

    const {data} = await axios.post(
        'https://open-api.trovo.live/openplatform/channels/id',
        {channel_id: trovo_id_memoization.get(username)},
        {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Client-ID': token,
            }
        }
    );

    return {
        live: data.is_live,
        title: data.live_title,
        viewers: data.current_viewers,
        id: username, platform: "trovo",
        name: username,
        avatar: data.profile_pic,
    }
}

const scrapers = new Map([
    ["youtube", youtube],
    ["dlive", dlive],
    ["bitwave", bitwave],
    ["robotstreamer", robotstreamer],
    ["trovo", trovo],
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

async function scrape(platform, id, name) {
    let data;
    if(!scrapers.has(platform)) {
        console.error(`Platform ${platform} not supported (${id})!`);
        return;
    }
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

        scrape(platform, id, person[2]);
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
