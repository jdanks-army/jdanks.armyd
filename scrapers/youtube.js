const axios = require("axios");

module.exports = ["youtube", async function (id) {
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
        avatar, name,
        live
    }

    // Usually, title/viewer data is sent regardless of live status.
    // However in this case it avoids some regex matches, making it slightly faster
    if (live) {
        r.title = title;
        let viewers = livedata.match(/videoPrimaryInfoRenderer".*?"viewCount".*?"runs".*?"text".*?"(.*?)"/s)[1]?.split(' ')[0];
        r.viewers = Number(viewers.replace(/[.,]/g, ""));
    }

    return r;
}];
