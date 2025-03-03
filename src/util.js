import { EmbedBuilder, MessageFlags } from 'discord.js';

export function createSimpleFailure(message) {
	return {
		embeds: [new EmbedBuilder().setDescription(message).setColor(0xFF0000)],
		flags: MessageFlags.Ephemeral,
	};
}

export function createSimpleSuccess(message) {
	return {
		embeds: [new EmbedBuilder().setDescription(message).setColor(0x00FF00)],
		flags: MessageFlags.Ephemeral,
	};
}