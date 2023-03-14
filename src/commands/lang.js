const { SlashCommandBuilder } = require('@discordjs/builders');
const { readFileSync } = require('fs');
const { createSimpleSuccess } = require('../util.js');

const lang = JSON.parse(readFileSync('./lang.json'));
const text = Object.keys(lang).map(key => `**${lang[key]}** - ${key}`).sort().reduce((prev, current) => prev + '\n' + current);

module.exports.command = {
	data: new SlashCommandBuilder()
		.setName('lang')
		.setDescription('Displays all entrance language options'),
	async execute(interaction) {
		const message = createSimpleSuccess(text);
		message.embeds[0].setTitle('Languages');
		await interaction.reply(message);
	},
};
