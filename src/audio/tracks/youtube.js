import { createAudioResource, demuxProbe } from '@discordjs/voice';
import ytdl from '@distube/ytdl-core';
import getYoutubeID from 'get-youtube-id';

class YoutubeTrack {

	constructor(id, volume) {
		this.id = id;
		this.volume = volume || 1;
	}

	createAudioResource() {
		return new Promise((resolve, reject) => {
			demuxProbe(ytdl(`https://www.youtube.com/watch?v=${this.id}`, { filter: 'audio' }))
				.then(probe => {
					const resource = createAudioResource(probe.stream, { metadata: this, inputType: probe.type, inlineVolume: true });
					resource.volume.setVolume(this.volume);
					resolve(resource);
				})
				.catch(reject);
		});
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