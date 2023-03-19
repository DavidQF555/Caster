const { createAudioResource } = require('@discordjs/voice');
const { stream } = require('play-dl');
const getYoutubeID = require('get-youtube-id');

class YoutubeTrack {

	constructor(id, volume) {
		this.id = id;
		this.volume = volume || 1;
	}

	async createAudioResource() {
		const out = await stream(`https://www.youtu.be/${this.id}`, { discordPlayerCompatibility: true });
		const resource = createAudioResource(out.stream, { metadata: this, inputType: out.type, inlineVolume: true });
		resource.volume.setVolume(this.volume);
		return resource;
	}

	getName() {
		return `[youtube video](https://youtu.be/${this.id})`;
	}

	serialize() {
		return {
			id: this.id,
			volume: this.volume,
		};
	}

}

module.exports = {
	create: options => new YoutubeTrack(options.id, options.volume),
	createFromCommand: options => {
		const id = getYoutubeID(options.getString('url', true));
		if(id) {
			return module.exports.create({
				id: id,
				volume: options.getNumber('volume'),
			});
		}
	},
};