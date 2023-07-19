import 'dotenv/config';
import { joinVoiceChannel, entersState, VoiceConnectionStatus } from '@discordjs/voice';
import { REST, Routes, Client, Collection, IntentsBitField } from 'discord.js';
import { readFileSync, existsSync } from 'fs';
import Scheduler from './audio/scheduler.js';
import { schedulers } from './reference.js';
import { createSimpleFailure } from './util.js';
import baseCommands from './commands.js';
import tracks from './audio/tracks.js';

const client = new Client({ intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildVoiceStates] });
const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);

const commands = new Collection();
await registerCommands();

client.on('interactionCreate', handleCommand);
client.on('voiceStateUpdate', voiceStateUpdate);
client.once('ready', () => {
	console.log('Ready!');
});

client.login(process.env.TOKEN);

async function registerCommands() {
	for (const command of baseCommands) {
		commands.set(command.data.name, command);
	}
	try {
		await rest.put(
			Routes.applicationCommands(process.env.CLIENT_ID),
			{ body: commands.map(command => command.data.toJSON()) },
		);
		console.log('Successfully registered application commands.');
	}
	catch (error) {
		console.error(error);
	}
}

async function handleCommand(interaction) {
	if (!interaction.isCommand()) return;
	const command = commands.get(interaction.commandName);
	if (!command) return;
	try {
		await command.execute(interaction);
	}
	catch (error) {
		console.error(error);
		if(!interaction.deferred) {
			await interaction.deferReply();
		}
		await interaction.followUp(createSimpleFailure('There was an error while executing this command!'));
	}
}

async function voiceStateUpdate(oldState, newState) {
	if(newState.member.user.bot || !newState.channel || newState.channel == oldState.channel || !existsSync('./data.json')) return;
	const storage = JSON.parse(readFileSync('./data.json'));
	if(!storage[newState.channel.guild.id]) return;
	const entrance = storage[newState.channel.guild.id][newState.id];
	if(!entrance) return;
	const type = tracks[entrance.type];
	if(type) {
		const old = schedulers[newState.guild.id];
		if(old) {
			old.end();
		}
		const track = type.create(entrance);
		const scheduler = new Scheduler(newState.channel.guild.id,
			joinVoiceChannel({
				channelId: newState.channelId,
				guildId: newState.guild.id,
				adapterCreator: newState.guild.voiceAdapterCreator,
			}), track,
		);
		schedulers[newState.guild.id] = scheduler;
		try {
			await entersState(scheduler.connection, VoiceConnectionStatus.Ready, 20e3);
		}
		catch (error) {
			console.warn(error);
			return;
		}
		await scheduler.start();
	}
}