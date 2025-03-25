# SSH Connection Guide for Render Services

## Important: Services on Free Plan

According to Render documentation, **SSH access is not available for free tier services**. If you're using a free tier service, you'll need to upgrade to a paid plan to use SSH.

## SSH Prerequisites

1. First add an SSH key to your Render account:
   - Go to your Render dashboard → Account Settings → SSH Keys
   - Add your public SSH key (e.g., contents of `~/.ssh/id_ed25519.pub`)
   
2. Ensure your service has been deployed after January 11, 2022

## Correct SSH Connection Format

To connect to your Render service via SSH, use the following format:

```
ssh quiz-node-backend@ssh.render.com
```

Where:
- `quiz-node-backend` is your service name (not your username)
- `ssh.render.com` is Render's SSH gateway

If your service is in another region, you may need to use:
```
ssh quiz-node-backend@ssh.YOUR_REGION.render.com
```

## Finding Your SSH Command

The easiest way to get the correct SSH command:
1. Go to your service in the Render dashboard
2. Click "Connect" button
3. Select the "SSH" tab
4. Copy the provided SSH command

## Setting Up an SSH Tunnel for MySQL

To connect to your MySQL database via SSH tunnel:

```
ssh -L 3307:quiz-database:3306 quiz-node-backend@ssh.render.com
```

Then connect your MySQL client to:
- Host: localhost
- Port: 3307
- Username: Sara
- Password: Your database password

## Troubleshooting

If you still cannot connect:

1. Verify your service is on a paid plan (not free tier)
2. Confirm your SSH key is properly added to your Render account
3. Make sure you're using the service name (not username) in the SSH command
4. Try adding `-v` flag for verbose output: `ssh -v quiz-node-backend@ssh.render.com`
5. Check the Render dashboard for your specific SSH command 