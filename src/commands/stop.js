import { SlashCommandBuilder } from '@discordjs/builders';
import { schedulers } from '../reference.js';
import { createSimpleSuccess, createSimpleFailure } from '../util.js';

export default {
	data: new SlashCommandBuilder()
		.setName('stop')
		.setDescription('Stops whatever Caster is playing'),
	async execute(interaction) {
		const scheduler = schedulers[interaction.guildId];
		if(!scheduler) {
			await interaction.reply(createSimpleFailure('Not currently playing anything'));
			return;
		}
		if(interaction.member.voice.channelId !== interaction.guild.members.me.voice.channelId) {
			await interaction.reply(createSimpleFailure('Must be in the same channel'));
			return;
		}
		scheduler.end();
		await interaction.reply(createSimpleSuccess(`Stopped playing ${scheduler.track.getName()}`));
	},
};
