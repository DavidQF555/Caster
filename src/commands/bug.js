import { SlashCommandBuilder } from 'discord.js';
import { createSimpleSuccess, createSimpleFailure } from '../util.js';
import tracks from '../audio/tracks.js';
import { schedulers } from '../reference.js';
import { joinVoiceChannel, entersState, VoiceConnectionStatus } from '@discordjs/voice';
import Scheduler from '../audio/scheduler.js';

export default {
	data: new SlashCommandBuilder()
		.setName('bug')
		.setDescription('Bugs target with a TTS message')
		.addUserOption(builder => builder
			.setName('target')
			.setDescription('Target of bug')
			.setRequired(true),
		)
		.addStringOption(builder => builder
			.setName('message')
			.setDescription('Message to say')
			.setRequired(true),
		)
		.addStringOption(builder =>
			builder.setName('lang')
				.setDescription('Language of text (options in /lang)')
				.setRequired(false),
		)
		.addNumberOption(builder =>
			builder.setName('volume')
				.setDescription('Volume factor')
				.setRequired(false),
		),
	async execute(interaction) {
		const user = interaction.options.getUser('target', true);
		if(user.bot) {
			await interaction.reply(createSimpleFailure('Target cannot be a bot.'));
			return;
		}
		await interaction.deferReply({ ephemeral: true });
		const member = await interaction.guild.members.fetch(user);
		if(!member.voice.channel) {
			await interaction.followUp(createSimpleFailure('Target must be in a voice channel.'));
			return;
		}
		const track = tracks.text.create({
			text: interaction.options.getString('message', true),
			lang: interaction.options.getString('lang'),
			volume: interaction.options.getNumber('volume'),
		});
		if(!track) {
			await interaction.followUp(createSimpleFailure('Error in this command'));
			return;
		}
		await interaction.followUp(createSimpleSuccess(`Bugging **${user.username}** with ${track.getName()}`));
		const old = schedulers[interaction.guild.id];
		if(old) {
			old.end();
		}
		const scheduler = new Scheduler(interaction.guildId, joinVoiceChannel({
			channelId: member.voice.channelId,
			guildId: interaction.guildId,
			adapterCreator: interaction.guild.voiceAdapterCreator,
		}), track);
		schedulers[interaction.guildId] = scheduler;
		try {
			await entersState(scheduler.connection, VoiceConnectionStatus.Ready, 20e3);
		}
		catch (error) {
			console.warn(error);
			return;
		}
		await scheduler.start();
	},
};