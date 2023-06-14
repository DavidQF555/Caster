import { createAudioResource } from '@discordjs/voice';
import { stream } from 'play-dl';
import getYoutubeID from 'get-youtube-id';

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

export default {
	create: create,
	createFromCommand: options => {
		const id = getYoutubeID(options.getString('url', true));
		if(id) {
			return create({
				id: id,
				volume: options.getNumber('volume'),
			});
		}
	},
};

function create(options) {
	return new YoutubeTrack(options.id, options.volume);
}