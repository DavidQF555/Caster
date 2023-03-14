# Caster

This a Discord bot created using [Node.js](https://nodejs.org/) and the [Discord.js](https://discord.js.org/) library. 

## Setup

1. Create a Discord application in the [Discord Developer Portal](https://discord.com/developers/applications)
2. In the *Bot* tab, click the *Add Bot* button
3. Copy the bot token and paste it as the **TOKEN** enviroment variable
4. Copy the client ID in the *OAuth2* tab and paste it as the **CLIENT_ID** environment variable
5. Add the bot to servers using `https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=3145728&scope=bot%20applications.commands`, replacing *CLIENT_ID* with the bot's client ID
6. Start the bot with the command `npm start` in the console

### Environment Variables
| Key | Value |
| - | - |
| TOKEN | Token of Discord bot |
| CLIENT_ID | Client ID of Discord bot |

## Usage

### Commands
| Name | Description |
| - | - |
| entrance | Sets the entrance speech for a user |
| lang | Displays all language options for entrance |