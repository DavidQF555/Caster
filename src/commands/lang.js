import { SlashCommandBuilder } from '@discordjs/builders';
import { readFileSync } from 'fs';
import { createSimpleSuccess } from '../util.js';

const lang = JSON.parse(readFileSync('./lang.json'));
const text = Object.keys(lang).map(key => `**${lang[key]}** - ${key}`).sort().reduce((prev, current) => prev + '\n' + current);

export default {
	data: new SlashCommandBuilder()
		.setName('lang')
		.setDescription('Displays all entrance language options'),
	async execute(interaction) {
		const message = createSimpleSuccess(text);
		message.embeds[0].setTitle('Languages');
		await interaction.reply(message);
	},
};
