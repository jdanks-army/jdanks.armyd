const axios = require("axios");

const platform = "bitwave";
module.exports = [platform, async function (id) {
    const {data: _data} = await axios.get(`https://api.bitwave.tv/v1/channels/${id}`);
    if (!_data?.success) return {};
    const data = _data.data;
    return {
        live: data.live,
        name: data.name,
        avatar: data.avatar,
        id, platform,
        viewers: data.viewCount,
        title: data.title,
    };
}];
