import { readdirSync } from 'fs';

const tracks = {};

await Promise.all(readdirSync('./src/audio/tracks').filter(file => file.endsWith('.js')).map(file => {
	return import(`./tracks/${file}`)
		.then(module => module.default)
		.then(val => tracks[file.substring(0, file.length - '.js'.length)] = val);
}));

export default tracks;