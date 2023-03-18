const { createAudioResource } = require('@discordjs/voice');
const { stream } = require('play-dl');
const getYoutubeID = require('get-youtube-id');

class YoutubeTrack {

	constructor(id, start, end) {
		this.id = id;
		this.start = start;
		this.end = end;
	}

	async createAudioResource() {
		const out = await stream(`https://www.youtu.be/${this.id}?t=${this.start}s&end=${this.end}s`, { discordPlayerCompatibility: true });
		return createAudioResource(out.stream, { metadata: this, inputType: out.type });
	}

	createMessage(user) {
		return `Set **${user}** entrance text to \`${this.id}\` from **${this.start}** to **${this.end}** seconds`;
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
	create: options => new YoutubeTrack(options.id, options.start, options.end),
	createFromCommand: options => {
		const id = getYoutubeID(options.getString('url', true));
		const start = options.getNumber('start', true);
		const end = options.getNumber('end', true);
		if(id && start < end) {
			return module.exports.create({
				id: id,
				start: start,
				end: end,
			});
		}
	},
};