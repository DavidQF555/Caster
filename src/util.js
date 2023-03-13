const { EmbedBuilder } = require('discord.js');

module.exports.createSimpleFailure = message => {
	return {
		embeds: [new EmbedBuilder().setDescription(message).setColor(0xFF0000)],
		ephemeral: true,
	};
};

module.exports.createSimpleSuccess = message => {
	return {
		embeds: [new EmbedBuilder().setDescription(message).setColor(0x00FF00)],
		ephemeral: true,
	};
};