require('dotenv').config();
const { REST } = require('@discordjs/rest');
const { Client, Collection, Intents } = require('discord.js');
const { readdirSync } = require('fs');
const { Routes } = require('discord-api-types/v9');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES] });
const commands = new Collection();
const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);

const files = readdirSync('./src/commands').filter(file => file.endsWith('.js')).map(file => require(`./commands/${file}`));
for (const file of files) {
	commands.set(file.data.name, file);
}
try {
	rest.put(
		Routes.applicationCommands(process.env.CLIENT_ID),
		{ body: files.map(file => file.data.toJSON()) },
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

client.once('ready', () => {
	console.log('Ready!');
});

client.login(process.env.TOKEN);