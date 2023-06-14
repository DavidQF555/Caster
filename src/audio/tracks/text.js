import tts from 'google-tts-api';
import { createAudioResource, demuxProbe } from '@discordjs/voice';
import { Readable } from 'stream';
import { readFileSync } from 'fs';

const lang = JSON.parse(readFileSync('./lang.json'));

export default {
	create: create,
	createFromCommand: options => {
		const text = options.getString('text', true);
		const volume = options.getNumber('volume');
		const language = options.getString('lang');
		return create({
			text: text,
			volume: volume,
			lang: language,
		});
	},
};

function create(options) {
	const text = options.text;
	const volume = options.volume;
	const language = options.lang;
	return new TextTrack(text, language, volume);
}

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

	async createAudioResource() {
		const audio = await tts.getAllAudioBase64(this.text,
			{
				lang: this.lang,
				timeout: 10000,
			})
			.catch(console.error);
		const stream = new Readable();
		for(const clip of audio) {
			stream.push(Buffer.from(clip.base64, 'base64'));
		}
		stream.push(null);
		const resource = await demuxProbe(stream).then(info => createAudioResource(info.stream, { inlineVolume: true, inputType: info.type }));
		resource.volume.setVolume(this.volume);
		return resource;
	}

}