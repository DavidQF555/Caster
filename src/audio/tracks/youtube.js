const { createAudioResource } = require('@discordjs/voice');
const { stream } = require('play-dl');
const getYoutubeID = require('get-youtube-id');

class YoutubeTrack {

	constructor(id) {
		this.id = id;
	}

	async createAudioResource() {
		const out = await stream(`https://www.youtu.be/${this.id}`, { discordPlayerCompatibility: true });
		return createAudioResource(out.stream, { metadata: this, inputType: out.type });
	}

	getName() {
		return `[youtube video](https://youtu.be/${this.id})`;
	}

	serialize() {
		return {
			id: this.id,
			start: this.start,
			end: this.end,
		};
	}

}

module.exports = {
	create: options => new YoutubeTrack(options.id),
	createFromCommand: options => {
		const id = getYoutubeID(options.getString('url', true));
		if(id) {
			return module.exports.create({
				id: id,
			});
		}
	},
};