const { FeatherlessNode } = require('./dist/nodes/FeatherlessNode/FeatherlessNode.node');
const { FeatherlessApi } = require('./dist/credentials/FeatherlessApi.credentials');

module.exports = {
    nodes: [
        FeatherlessNode
    ],
    credentials: [
        FeatherlessApi
    ],
    version: require('./package.json').version,
};