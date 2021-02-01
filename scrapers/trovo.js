const axios = require("axios");
const assert = require("assert");

const id_memoization = new Map();
module.exports = ["trovo", async function (username) {
    // TODO: Take a more functional approach and wrap the entire
    //       lambda instead of accessing it directly?
    const token = process.env.TROVO_CLIENT_ID;
    if(!token) throw new Error("No TROVO_CLIENT_ID set.");

    // Get IDs for usernames
    if (!id_memoization.has(username)) {
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
        id_memoization.set(username, data.users[0].channel_id);
    }

    assert(id_memoization.has(username));

    const {data} = await axios.post(
        'https://open-api.trovo.live/openplatform/channels/id',
        {channel_id: id_memoization.get(username)},
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
        name: username,
        avatar: data.profile_pic,
    }
}];
