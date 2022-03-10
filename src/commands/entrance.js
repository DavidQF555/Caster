const { SlashCommandBuilder } = require('@discordjs/builders');
const { entrances } = require('../storage.js');
const { createSimpleSuccess } = require('../util.js');
const {
	AudioPlayerStatus,
	createAudioPlayer,
	entersState,
	VoiceConnectionDisconnectReason,
	VoiceConnectionStatus,
	demuxProbe,
	createAudioResource,
} = require('@discordjs/voice');
const { getAudioBase64 } = require('google-tts-api');
const { promisify } = require('util');
const wait = promisify(setTimeout);

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
		),
	async execute(interaction) {
		const text = interaction.options.getString('text', true);
		const user = interaction.options.getUser('user', true);
		entrances[user.id] = text;
		await interaction.reply(createSimpleSuccess('Set ' + user.username + ' entrance text to ' + text));
	},
};

module.exports.Scheduler = class Scheduler {

	constructor(text, connection) {
		this.text = text;
		this.connection = connection;
		this.player = createAudioPlayer();
		this.connection.on('stateChange', async (oldState, newState) => {
			if (newState.status === VoiceConnectionStatus.Disconnected) {
				if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
					try {
						await entersState(this.connection, VoiceConnectionStatus.Connecting, 5e3);
					}
					catch {
						this.connection.destroy();
					}
				}
				else if (this.connection.rejoinAttempts < 5) {
					await wait((this.connection.rejoinAttempts + 1) * 5e3);
					this.connection.rejoin();
				}
				else {
					this.connection.destroy();
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
					if (this.connection.state.status !== VoiceConnectionStatus.Destroyed) this.connection.destroy();
				}
				finally {
					this.readyLock = false;
				}
			}
		});
		this.player.on('stateChange', (oldState, newState) => {
			if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
				const audio = this.create(text);
				this.player.play(audio);
			}
		});
		this.player.on('error', error => error.resource.metadata.onError(error));
		this.connection.subscribe(this.player);
	}

	async create(text) {
		return await getAudioBase64(text)
			.then(response => Buffer.from(response, 'base64'))
			.then(response => {
				demuxProbe(response)
					.then(probe => createAudioResource(probe.stream));
			});
	}

};