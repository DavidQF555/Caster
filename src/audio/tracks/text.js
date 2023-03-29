const tts = require('google-tts-api');
const { createAudioResource } = require('@discordjs/voice');
const { readFileSync, existsSync, mkdirSync, writeFileSync } = require('fs');

const lang = JSON.parse(readFileSync('./lang.json'));

module.exports = {
	create: options => {
		const text = options.text;
		const volume = options.volume;
		const language = options.lang;
		return new TextTrack(text, language, volume);
	},
	createFromCommand: options => {
		const text = options.getString('text', true);
		const volume = options.getNumber('volume');
		const language = options.getString('lang');
		return module.exports.create({
			text: text,
			volume: volume,
			lang: language,
		});
	},
};

class TextTrack {

	constructor(text, language, volume) {
		this.text = text;
		this.lang = language;
		if(!this.lang || !Object.keys(lang).includes(this.lang)) {
			this.lang = 'en';
		}
		this.volume = volume || 1;
	}

	serialize() {
		return {
			text: this.text,
			lang: this.lang,
			volume: this.volume,
		};
	}

	getName() {
		return `\`${this.text}\` in **${lang[this.lang]}**`;
	}

	async createAudioResource(guildId) {
		const path = './temp';
		if(!existsSync(path)) {
			mkdirSync(path);
		}
		const file = path + '/' + guildId + '.wav';
		const audio = await tts.getAllAudioBase64(this.text,
			{
				lang: this.lang,
				timeout: 10000,
			})
			.catch(console.error);
		const buffer = Buffer.concat(audio.map(clip => Buffer.from(clip.base64, 'base64')));
		writeFileSync(file, buffer);
		const resource = createAudioResource(file, { inlineVolume: true });
		resource.volume.setVolume(this.volume);
		return resource;
	}

}