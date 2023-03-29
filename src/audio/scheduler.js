const {
	AudioPlayerStatus,
	createAudioPlayer,
	entersState,
	VoiceConnectionStatus,
} = require('@discordjs/voice');
const { schedulers } = require('../reference.js');

module.exports = class Scheduler {

	constructor(guildId, connection, track) {
		this.guildId = guildId;
		this.connection = connection;
		this.track = track;
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
		this.player.play(await this.track.createAudioResource(this.guildId));
	}

};