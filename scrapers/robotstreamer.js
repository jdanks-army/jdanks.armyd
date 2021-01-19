const axios = require("axios");

module.exports = ["robotstreamer", async function (id, name) {
    const {data: _data} = await axios.get(`http://api.robotstreamer.com:8080/v1/get_robot/${id}`);
    const data = _data[0];

    const live = data.status === "online";
    const title = data.robot_name;
    const viewers = data.viewers;

    return {
        live, name,
        title, viewers
    }
}];
