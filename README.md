# Ironmon

A discord bot for managing guild events. Created originally for my World of Warcraft guild to manage our signups for raids.

## Development

```bash
npm i
npm run dev
```

### Setting up .env file

For the bot to work you need to setup `.env` file. File called `.env.example` contains example of the `.env` file you need to have. Copy it and rename it then to `.env`. Then change the values to your own ones.

| Key            | Description                                            | Example value                                     |
| -------------- | ------------------------------------------------------ | ------------------------------------------------- |
| BOT_AUTH_TOKEN | The secret bot authorization token issued by Discord\* | s6EefggqESBAF65fs2g1iaZlQyI6NQv7FgecxAcTUyVtYjTaD |
| ADMINS         | Discord IDs of admin users\*\*                         | 123456789012345678                                |

\* You can get the secret authorization by following this guide [Create a Discord bot under 15 minutes](https://thomlom.dev/create-a-discord-bot-under-15-minutes/). Getting the token start at "Get that token"-step.  
\*\* Find out how to get your Discord ID from the [official documentation](https://support.discordapp.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-).
