const axios = require("axios");

module.exports = ["dlive", async function (name) {
    const {data} = await axios.post('https://graphigo.prd.dlive.tv/',
        `{"query":"query{userByDisplayName(displayname: \\"${name}\\") {livestream{ view title } avatar}}"}`);

    const response = data.data.userByDisplayName;
    const live = !!response.livestream;

    return {
        avatar: response.avatar,
        live, name,
        viewers: response.livestream?.view,
        title: response.livestream?.title,
    };
}];
