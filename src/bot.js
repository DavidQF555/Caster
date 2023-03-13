require('dotenv').config();
const { REST } = require('@discordjs/rest');
const { joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice');
const { Client, Collection, IntentsBitField } = require('discord.js');
const { readdirSync, readFileSync, existsSync } = require('fs');
const { Routes } = require('discord-api-types/v9');
const { Scheduler } = require('./commands/entrance');
const { schedulers } = require('./reference.js');

const client = new Client({ intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildVoiceStates] });
const commands = new Collection();
const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);

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
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});

client.on('voiceStateUpdate', async (oldState, newState) => {
	if(newState.member.user.bot || !newState.channel || newState.channel == oldState.channel || !existsSync('./storage.json')) return;
	const storage = JSON.parse(readFileSync('./storage.json'));
	if(!storage[newState.channel.guild.id]) return;
	const entrance = storage[newState.channel.guild.id][newState.id];
	if(!entrance) return;
	const old = schedulers[newState.guild.id];
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
	schedulers[newState.guild.id] = scheduler;
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