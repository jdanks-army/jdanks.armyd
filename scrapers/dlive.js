const axios = require("axios");

module.exports = ["dlive", async function (id) {
    const {data} = await axios.post('https://graphigo.prd.dlive.tv/',
        `{"query":"query{userByDisplayName(displayname: \\"${id}\\") {livestream{ view title } avatar}}"}`);

    const response = data.data.userByDisplayName;
    const live = !!response.livestream;

    return {
        id, name: id,
        avatar: response.avatar,
        live,
        viewers: response.livestream.view,
        title: response.livestream.title,
    };
}];
