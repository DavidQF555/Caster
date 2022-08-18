const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField } = require('discord.js');
const { createSimpleSuccess, createSimpleFailure } = require('../util.js');
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
const { schedulers } = require('../reference.js');
const {
	AudioPlayerStatus,
	createAudioPlayer,
	entersState,
	VoiceConnectionStatus,
	createAudioResource,
} = require('@discordjs/voice');
const say = require('say');

module.exports.command = {
	data: new SlashCommandBuilder()
		.setName('entrance')
		.setDescription('Sets entrance speech')
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
		.addNumberOption(builder =>
			builder.setName('speed')
				.setDescription('Speed factor')
				.setRequired(false),
		)
		.addNumberOption(builder =>
			builder.setName('volume')
				.setDescription('Volume factor')
				.setRequired(false),
		),
	async execute(interaction) {
		if(!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageNicknames)) {
			await interaction.reply(createSimpleFailure('You do not have permission'));
			return;
		}
		const user = interaction.options.getUser('user', true);
		const text = interaction.options.getString('text', true);
		const speed = interaction.options.getNumber('speed') || 1;
		const volume = interaction.options.getNumber('volume') || 1;
		let storage = {};
		if(existsSync('./storage.json')) {
			storage = JSON.parse(readFileSync('./storage.json'));
		}
		if(!storage[interaction.guildId]) {
			storage[interaction.guildId] = {};
		}
		storage[interaction.guildId][user.id] = {
			text: text,
			speed: speed,
			volume: volume,
		};
		writeFileSync('./storage.json', JSON.stringify(storage));
		await interaction.reply(createSimpleSuccess(`Set **${user.username}** entrance text to \`${text}\``));
	},
};

module.exports.Scheduler = class Scheduler {

	constructor(guildId, entrance, connection) {
		this.guildId = guildId;
		this.text = entrance.text;
		this.connection = connection;
		this.speed = entrance.speed;
		this.volume = entrance.volume;
		this.player = createAudioPlayer();
		this.connection.on('stateChange', async (oldState, newState) => {
			if(newState.status === VoiceConnectionStatus.Disconnected) {
				this.stop();
			}
			else if (newState.status === VoiceConnectionStatus.Destroyed) {
				this.player.stop(true);
			}
			else if (!this.readyLock && (newState.status === VoiceConnectionStatus.Connecting || newState.status === VoiceConnectionStatus.Signalling)) {
				this.readyLock = true;
				try {
					await entersState(this.connection, VoiceConnectionStatus.Ready, 20e3);
				}
				catch {
					this.end();
				}
				finally {
					this.readyLock = false;
				}
			}
		});
		this.player.on('stateChange', async (oldState, newState) => {
			if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
				this.end();
			}
		});
		this.player.on('error', console.warn);
		this.connection.subscribe(this.player);
	}

	end() {
		if (this.connection.state.status !== VoiceConnectionStatus.Destroyed) this.connection.destroy();
		schedulers[this.guildId] = null;
	}

	async start() {
		const path = './temp';
		if(!existsSync(path)) {
			mkdirSync(path);
		}
		const file = this.guildId + '.wav';
		say.export(this.text, null, this.speed, path + '/' + file, console.warn);
		// temp fix for audio file not exported when creating resource
		return new Promise(resolve => setTimeout(resolve, 3000))
			.then(() => {
				const resource = createAudioResource(path + '/' + file, { inlineVolume: true });
				resource.volume.setVolume(this.volume);
				this.player.play(resource);
			});
	}

};