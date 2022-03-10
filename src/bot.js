require('dotenv').config();
const { REST } = require('@discordjs/rest');
const { joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice');
const { Client, Collection, Intents } = require('discord.js');
const { readdirSync } = require('fs');
const { Routes } = require('discord-api-types/v9');
const { entrances, schedulers } = require('./storage');
const { Scheduler } = require('./commands/entrance');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES] });
const commands = new Collection();
const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);

const files = readdirSync('./src/commands').filter(file => file.endsWith('.js')).map(file => require(`./commands/${file}`));
for (const file of files) {
	commands.set(file.command.data.name, file.command);
}
try {
	rest.put(
		Routes.applicationGuildCommands(process.env.CLIENT_ID, 545199185784471554n),
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
	if(!newState.channel) return;
	const text = entrances[newState.id];
	if(!text) return;
	const connection = joinVoiceChannel({
		channelId: newState.channelId,
		guildId: newState.channel.guild.id,
		adapterCreator: newState.channel.guild.voiceAdapterCreator,
	});
	connection.on('error', console.warn);
	const scheduler = new Scheduler(text,
		joinVoiceChannel({
			channelId: newState.channelId,
			guildId: newState.guildId,
			adapterCreator: newState.channel.guild.voiceAdapterCreator,
		}),
	);
	schedulers[newState.guildId] = scheduler;
	try {
		await entersState(connection, VoiceConnectionStatus.Ready, 20e3);
	}
	catch (error) {
		console.warn(error);
		return;
	}
});

client.once('ready', () => {
	console.log('Ready!');
});

client.login(process.env.TOKEN);