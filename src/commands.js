import { readdirSync } from 'fs';

const commands = Promise.all(readdirSync('./src/commands').filter(file => file.endsWith('.js')).map(file => import(`./commands/${file}`).then(module => module.default)));

export default await commands;