const { SlashCommandBuilder } = require('@discordjs/builders');
const { schedulers } = require('../reference.js');
const { createSimpleSuccess, createSimpleFailure } = require('../util.js');

module.exports.command = {
	data: new SlashCommandBuilder()
		.setName('stop')
		.setDescription('Stops whatever Caster is playing'),
	async execute(interaction) {
		const scheduler = schedulers[interaction.guildId];
		if(!scheduler) {
			await interaction.reply(createSimpleFailure('Not currently playing anything'));
			return;
		}
		scheduler.end();
		await interaction.reply(createSimpleSuccess(`Stopped playing ${scheduler.track.getName()}`));
	},
};
