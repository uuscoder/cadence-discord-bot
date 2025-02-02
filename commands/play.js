const { SlashCommandBuilder } = require('@discordjs/builders');
const { useMainPlayer } = require('discord-player');
const { EmbedBuilder } = require('discord.js');
const { embedColors } = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a track provided by search terms or URL.')
        .addStringOption((option) =>
            option
                .setName('query')
                .setDescription('Search terms or URL.')
                .setRequired(true)
        ),
    run: async ({ interaction }) => {
        if (!interaction.member.voice.channel) {
            return await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(
                            `**Failed**\nYou need to be in a voice channel to use this command.`
                        )
                        .setColor(embedColors.colorWarning)
                ]
            });
        }

        const player = useMainPlayer();
        const query = interaction.options.getString('query');

        const searchResult = await player.search(query, {
            requestedBy: interaction.user
        });

        if (!searchResult || searchResult.tracks.length === 0) {
            return await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(
                            `**No track found**\nNo results found for \`${query}\`.`
                        )
                        .setColor(embedColors.colorWarning)
                ]
            });
        }

        if (
            searchResult.tracks[0].raw.live &&
            searchResult.tracks[0].raw.duration === 0 &&
            searchResult.tracks[0].source === 'youtube'
        ) {
            return await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(
                            `**Unsupported Source**\nThis audio source is a YouTube live stream, which is currently not a supported format.\n\n_If you think that this is incorrect, please submit a bug report in the bot [support server](https://discord.gg/t6Bm8wPpXB)._`
                        )
                        .setColor(embedColors.colorWarning)
                ]
            });
        }

        const { track } = await player.play(
            interaction.member.voice.channel,
            searchResult,
            {
                requestedBy: interaction.user,
                nodeOptions: {
                    leaveOnEmptyCooldown: 60000,
                    leaveOnEndCooldown: 60000,
                    leaveOnStopCooldown: 60000,
                    maxSize: 10000,
                    maxHistorySize: 100
                }
            }
        );

        if (track.source === 'arbitrary') {
            track.thumbnail =
                'https://raw.githubusercontent.com/mariusbegby/cadence-discord-bot/main/icons/Cadence-icon-rounded-128px.png';
        }

        let durationFormat =
            track.raw.duration === 0 || track.duration === '0:00'
                ? ''
                : `\`[${track.duration}]\``;

        if (searchResult.playlist && searchResult.tracks.length > 1) {
            return await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setAuthor({
                            name: interaction.user.username,
                            iconURL: interaction.user.avatarURL()
                        })
                        .setDescription(
                            `**Added playlist to queue**\n${durationFormat} **[${
                                track.title
                            }](${track.url})**\n\nAnd **${
                                searchResult.tracks.length - 1
                            }** more tracks... \`/queue\` to view all.`
                        )
                        .setThumbnail(track.thumbnail)
                        .setColor(embedColors.colorSuccess)
                ]
            });
        }

        return await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setAuthor({
                        name: interaction.user.username,
                        iconURL: interaction.user.avatarURL()
                    })
                    .setDescription(
                        `**Added to queue**\n${durationFormat} **[${track.title}](${track.url})**`
                    )
                    .setThumbnail(track.thumbnail)
                    .setColor(embedColors.colorSuccess)
            ]
        });
    }
};
