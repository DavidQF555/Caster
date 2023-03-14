const { SlashCommandBuilder } = require('@discordjs/builders');
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
const lang = JSON.parse(readFileSync('./lang.json'));
const tts = require('google-tts-api');

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
		const user = interaction.options.getUser('user', true);
		if(user.bot) {
			await interaction.reply(createSimpleFailure('Cannot set a bot\'s entrance text'));
			return;
		}
		const text = interaction.options.getString('text', true);
		const volume = interaction.options.getNumber('volume') || 1;
		let language = interaction.options.getString('lang');
		if(!lang || !Object.keys(lang).includes(language)) {
			language = 'en';
		}
		let storage = {};
		if(existsSync('./storage.json')) {
			storage = JSON.parse(readFileSync('./storage.json'));
		}
		if(!storage[interaction.guildId]) {
			storage[interaction.guildId] = {};
		}
		storage[interaction.guildId][user.id] = {
			text: text,
			volume: volume,
			lang: language,
		};
		writeFileSync('./storage.json', JSON.stringify(storage));
		await interaction.reply(createSimpleSuccess(`Set **${user.username}** entrance text to \`${text}\` in **${lang[language]}**`));
	},
};

module.exports.Scheduler = class Scheduler {

	constructor(guildId, entrance, connection) {
		this.guildId = guildId;
		this.text = entrance.text;
		this.lang = entrance.lang;
		this.volume = entrance.volume;
		this.connection = connection;
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
		const file = path + '/' + this.guildId + '.wav';
		const audio = (await tts.getAllAudioBase64(this.text,
			{
				lang: this.lang,
				timeout: 10000,
			})
			.catch(console.error));
		const buffer = Buffer.concat(audio.map(clip => Buffer.from(clip.base64, 'base64')));
		writeFileSync(file, buffer);
		const resource = createAudioResource(file, { inlineVolume: true });
		resource.volume.setVolume(this.volume);
		this.player.play(resource);
	}
};