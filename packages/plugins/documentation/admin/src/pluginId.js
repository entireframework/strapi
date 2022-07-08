import pluginPkg from '../../package.json';

const pluginId = pluginPkg.name.replace(/^@entireframework\/plugin-/i, '');

export default pluginId;
