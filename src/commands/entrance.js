import { SlashCommandBuilder } from 'discord.js';
import { createSimpleSuccess, createSimpleFailure } from '../util.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import tracks from '../audio/tracks.js';

export default {
	data: new SlashCommandBuilder()
		.setName('entrance')
		.setDescription('Sets entrance audio')
		.addSubcommand(b =>
			b.setName('text')
				.setDescription('Adds text-to-speech audio')
				.addUserOption(builder =>
					builder.setName('user')
						.setDescription('Target user')
						.setRequired(true),
				)
				.addStringOption(builder =>
					builder.setName('text')
						.setDescription('Text on entrance')
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
		)
		.addSubcommand(b =>
			b.setName('youtube')
				.setDescription('Adds youtube video')
				.addUserOption(builder =>
					builder.setName('user')
						.setDescription('Target user')
						.setRequired(true),
				)
				.addStringOption(builder =>
					builder.setName('url')
						.setDescription('Text on entrance')
						.setRequired(true),
				)
				.addNumberOption(builder =>
					builder.setName('volume')
						.setDescription('Volume factor')
						.setRequired(false),
				),
		),
	async execute(interaction) {
		const user = interaction.options.getUser('user', true);
		if(user.bot) {
			await interaction.reply(createSimpleFailure('Cannot set a bot\'s entrance text'));
			return;
		}
		const subcommand = interaction.options.getSubcommand();
		const exp = tracks[subcommand];
		if(exp) {
			const track = exp.createFromCommand(interaction.options);
			if(!track) {
				await interaction.reply(createSimpleFailure('Error in this command'));
				return;
			}
			let storage = {};
			if(existsSync('./data.json')) {
				storage = JSON.parse(readFileSync('./data.json'));
			}
			if(!storage[interaction.guildId]) {
				storage[interaction.guildId] = {};
			}
			storage[interaction.guildId][user.id] = track.serialize();
			storage[interaction.guildId][user.id].type = subcommand;
			writeFileSync('./data.json', JSON.stringify(storage, null, '	'));
			await interaction.reply(createSimpleSuccess(`Set entrance audio for **${user.username}** to ${track.getName()}`));
		}
	},
};