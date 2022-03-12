const { SlashCommandBuilder } = require('@discordjs/builders');
const { entrances, schedulers } = require('../storage.js');
const { createSimpleSuccess } = require('../util.js');
const { existsSync, mkdirSync } = require('fs');
const {
	AudioPlayerStatus,
	createAudioPlayer,
	entersState,
	VoiceConnectionDisconnectReason,
	VoiceConnectionStatus,
	createAudioResource,
} = require('@discordjs/voice');
const { promisify } = require('util');
const wait = promisify(setTimeout);
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
		const text = interaction.options.getString('text', true);
		const user = interaction.options.getUser('user', true);
		const speed = interaction.options.getNumber('speed') || 1;
		const volume = interaction.options.getNumber('volume') || 1;
		entrances[user.id] = {
			text: text,
			speed: speed,
			volume: volume,
		};
		await interaction.reply(createSimpleSuccess(`Set ${user.username} entrance text to ${text}`));
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
			if (newState.status === VoiceConnectionStatus.Disconnected) {
				if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
					try {
						await entersState(this.connection, VoiceConnectionStatus.Connecting, 5e3);
					}
					catch {
						this.end();
					}
				}
				else if (this.connection.rejoinAttempts < 5) {
					await wait((this.connection.rejoinAttempts + 1) * 5e3);
					this.connection.rejoin();
				}
				else {
					this.end();
				}
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
					if (this.connection.state.status !== VoiceConnectionStatus.Destroyed) this.end();
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
		this.connection.destroy();
		schedulers[this.guildId] = null;
	}

	start() {
		const path = './temp';
		if(!existsSync(path)) {
			mkdirSync(path);
		}
		const file = this.guildId + '.wav';
		say.export(this.text, null, this.speed, path + '/' + file, console.warn);
		const resource = createAudioResource(path + '/' + file, { inlineVolume: true });
		resource.volume.setVolume(this.volume);
		this.player.play(resource);
	}

};