const axios = require("axios");

const avatars = new Map();

const hasAuth = process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET && 1;

// Twitch needs you to first acquire an access token before interacting with their API
//
// `twitch_access_token' is initally a promise which resolves with the token (see line 11).
// After that resolves, a then() handler sets an interval to refresh the token (see line 26)

let refreshIntervalId;
let twitch_access_token = !hasAuth ? undefined : new Promise(async (resolve, reject) => {
    try {
        const {data} = await axios.post(
            `https://id.twitch.tv/oauth2/token`
            + `?client_id=${process.env.TWITCH_CLIENT_ID}`
            + `&client_secret=${process.env.TWITCH_CLIENT_SECRET}`
            + `&grant_type=client_credentials`
        );
        resolve(data);
    } catch (e) {
        reject(e);
    }
});
twitch_access_token?.then((data) => {
    refreshIntervalId = setInterval(async () => {
        const {data} = await axios.post(
            `https://id.twitch.tv/oauth2/token`
            + `?client_id=${process.env.TWITCH_CLIENT_ID}`
            + `&client_secret=${process.env.TWITCH_CLIENT_SECRET}`
            + `&grant_type=client_credentials`
        );
        twitch_access_token = data;
    }, Math.min(2147483647, data.expires_in * 1000));
    // If the expires_in value is bigger than 32 bits, pick the largest possible number.

    // It usually takes about ~2mo for a token to expire, but you never know
    // when it might take less
})

module.exports = ["twitch", async function (username) {
    const access_token = (await twitch_access_token)?.access_token;

    if(!hasAuth) throw new Error("No TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET set.");
    else if(!access_token) throw new Error("Could not auth* with Twitch!");

    // Update avatar every fifth scrape of the same username
    // or; update avatars on 25 minute basis
    if (!avatars.has(username) || avatars.get(username)[1] === 5) {
        const {data: user_data} = await axios.get(`https://api.twitch.tv/helix/users?login=${username}`, {
            headers: {
                'Client-Id': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${access_token}`
            },
        });
        avatars.set(username, [user_data.data[0].profile_image_url, 5]);
    } else {
        avatars.get(username)[1]--;
    }

    const {data: _data} = await axios.get(`https://api.twitch.tv/helix/streams?user_login=${username}`, {
        headers: {
            'Client-Id': process.env.TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${access_token}`
        }
    });
    const stream_data = _data.data[0];

    return {
        live: !!stream_data,
        name: username,
        avatar: avatars.get(username)[0],
        title: stream_data?.title,
        viewers: stream_data?.viewer_count
    };
}];
