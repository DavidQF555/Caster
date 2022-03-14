require('dotenv').config();
const { REST } = require('@discordjs/rest');
const { joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice');
const { Client, Collection, Intents } = require('discord.js');
const { readdirSync, readFileSync, existsSync } = require('fs');
const { Routes } = require('discord-api-types/v9');
const { Scheduler } = require('./commands/entrance');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES] });
const commands = new Collection();
const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);
module.exports.schedulers = {};

const files = readdirSync('./src/commands').filter(file => file.endsWith('.js')).map(file => require(`./commands/${file}`));
for (const file of files) {
	commands.set(file.command.data.name, file.command);
}
try {
	rest.put(
		Routes.applicationCommands(process.env.CLIENT_ID),
		{ body: files.map(file => file.command.data.toJSON()) },
	);
	console.log('Successfully registered application commands.');
}
catch (error) {
	console.error(error);
}

client.on('interactionCreate', async (interaction) => {
	if (!interaction.isCommand()) return;
	const command = commands.get(interaction.commandName);
	if (!command) return;
	try {
		await command.execute(interaction);
	}
	catch (error) {
		console.error(error);
		await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});

client.on('voiceStateUpdate', async (oldState, newState) => {
	if(oldState.channel || !newState.channel || !existsSync('./storage.json')) return;
	const storage = JSON.parse(readFileSync('./storage.json'));
	if(!storage[newState.channel.guild.id]) return;
	const entrance = storage[newState.channel.guild.id][newState.id];
	if(!entrance) return;
	const old = module.exports.schedulers[newState.guild.id];
	if(old) {
		old.end();
	}
	const connection = joinVoiceChannel({
		channelId: newState.channelId,
		guildId: newState.channel.guild.id,
		adapterCreator: newState.channel.guild.voiceAdapterCreator,
	});
	connection.on('error', console.warn);
	const scheduler = new Scheduler(newState.channel.guild.id, entrance,
		joinVoiceChannel({
			channelId: newState.channelId,
			guildId: newState.guild.id,
			adapterCreator: newState.guild.voiceAdapterCreator,
		}),
	);
	module.exports.schedulers[newState.guild.id] = scheduler;
	try {
		await entersState(connection, VoiceConnectionStatus.Ready, 20e3);
	}
	catch (error) {
		console.warn(error);
		return;
	}
	await scheduler.start();
});

client.once('ready', () => {
	console.log('Ready!');
});

client.login(process.env.TOKEN);