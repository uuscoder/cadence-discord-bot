const fs = require('node:fs');
const Discord = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const { Player, onBeforeCreateStream } = require('discord-player');
const { stream } = require('yt-stream');
const { token, embedColors } = require('./config.json');

// Setup required permissions for the bot to work
const client = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildVoiceStates
    ]
});

// Setup commands collection and load commands
client.commands = new Discord.Collection();
const commandFiles = fs
    .readdirSync('./commands')
    .filter((file) => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

const systemCommandFiles = fs
    .readdirSync('./system-commands')
    .filter((file) => file.endsWith('.js'));
for (const file of systemCommandFiles) {
    const systemCommand = require(`./system-commands/${file}`);
    client.commands.set(systemCommand.data.name, systemCommand);
}

// Create a new Player, and attach it to the bot client.
const player = new Player(client, {
    useLegacyFFmpeg: false
});

onBeforeCreateStream(async (track) => {
    if (track.source === 'youtube') {
        return (
            await stream(track.url, {
                type: 'audio',
                quality: 'high',
                highWaterMark: 1 << 25
            })
        ).stream;
    }

    return null;
});

player.events.on('error', (queue, error) => {
    // Emitted when the player queue encounters error
    console.error(
        `${new Date()
            .toISOString()
            .substring(11, 19)}: Error: 🚨 General player error event: ${
            error.message
        }\n`
    );
    console.error(error);
});

player.events.on('playerError', (queue, error) => {
    // Emitted when the audio player errors while streaming audio track
    console.error(
        `${new Date()
            .toISOString()
            .substring(11, 19)}: Error: 🚨 Player error event: ${
            error.message
        }\n`
    );
    console.error(error);
});

client.once('ready', async () => {
    console.log(
        `${new Date().toISOString().substring(11, 19)}: Info: Logged in as ${
            client.user.tag
        }!`
    );

    // This method will load all the extractors from the @discord-player/extractor package
    await player.extractors.loadDefault();
    console.log(player.scanDeps());

    // Set Discord status
    client.user.setActivity('/help', {
        type: Discord.ActivityType.Watching,
        name: '/help'
    });

    // Show how many guilds the bot is added to
    console.log(
        `${new Date().toISOString().substring(11, 19)}: Info: ${
            client.user.tag
        } is currently added in ${client.guilds.cache.size} guilds!`
    );
});

client.once('reconnecting', () => {
    console.log('Reconnecting!');
});

client.once('disconnect', () => {
    console.log('Disconnected');
});

client.on('warn', (info) => {
    console.log(info);
});

client.on('error', console.error);

client.on('guildCreate', (guild) => {
    console.log(
        `${new Date().toISOString().substring(11, 19)}: Info: 🟢 ${
            client.user.tag
        } has been added to server '${guild.name} (#${guild.memberCount})'!`
    );
});

client.on('guildDelete', (guild) => {
    console.log(
        `${new Date().toISOString().substring(11, 19)}: Info: 🔴 ${
            client.user.tag
        } was removed from server '${guild.name} (#${guild.memberCount})'!`
    );
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) {
        return;
    }

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        const inputTime = new Date();
        await interaction.deferReply();
        await command.run({ interaction, client });
        const outputTime = new Date();
        const executionTime = outputTime - inputTime;

        if (executionTime > 20000) {
            // don't send warning message for filters command, as collector timeout happens after 60 seconds
            if (command.name === 'filters' && executionTime > 55000) {
                console.log(
                    `${new Date().toISOString().substring(11, 19)}: Info: ${
                        interaction.guild.name
                    } (#${
                        interaction.guild.memberCount
                    })> Command '${interaction}' executed in ${executionTime} ms.`
                );
                return;
            }

            console.log(
                `${new Date().toISOString().substring(11, 19)}: Warning: ⚠️ ${
                    interaction.guild.name
                } (#${
                    interaction.guild.memberCount
                })> Command '${interaction}' took ${executionTime} ms to execute.`
            );

            return await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(
                            `**Warning**\n**This command took ${
                                executionTime / 1000
                            } seconds to execute.**\n\n_If you experienced problems with the command, please try again._`
                        )
                        .setColor(embedColors.colorWarning)
                ]
            });
        } else {
            console.log(
                `${new Date().toISOString().substring(11, 19)}: Info: ${
                    interaction.guild.name
                } (#${
                    interaction.guild.memberCount
                })> Command '${interaction}' executed in ${executionTime} ms.`
            );
        }
    } catch (error) {
        // log error to console with full object depth
        console.dir(error, { depth: 5 });
        console.error(
            `${new Date().toISOString().substring(11, 19)}: Error: 🚨 ${
                interaction.guild.name
            } (#${
                interaction.guild.memberCount
            })> Command '${interaction}' failed unexpectedly.`
        );
        console.error(`Interaction input:\n${interaction}`);

        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setDescription(
                        `**Unexpected Error**\nThere was an error while executing this command! Please try again.\n\n_If this issue persists, please submit a bug report in the bot [support server](https://discord.gg/t6Bm8wPpXB)._`
                    )
                    .setColor(embedColors.colorError)
            ]
        });
    }
});

client.login(token);
