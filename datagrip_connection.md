# DataGrip MySQL Connection Guide for Render

This guide provides instructions for connecting to your Render MySQL database using DataGrip.

## Important Note

According to Render documentation, **SSH access is not available for free tier services**. If you're using a free tier service, you'll need to upgrade to a paid plan to use SSH tunneling.

## Getting Your SSH Command

The easiest way to get the correct SSH information:
1. Go to your service in the Render dashboard
2. Click "Connect" button
3. Select the "SSH" tab
4. Copy the provided SSH command (should be in format `ssh SERVICE_NAME@ssh.render.com`)

## Connection Settings

### General Settings
- **Name**: Render MySQL Connection
- **Comment**: Quiz Database on Render

### Connection Details
- **Host**: localhost
- **Port**: 3307 (local port forwarding)
- **Database**: aischool
- **User**: Sara
- **Password**: Sara0330!!

### SSH/SSL Settings
- **Use SSH tunnel**: Checked ✓
- **SSH Configuration**:
  - **Host**: ssh.render.com
  - **Port**: 22
  - **Username**: quiz-node-backend (service name, not your account name)
  - **Authentication type**: Key pair
  - **Private key file**: Path to your SSH private key (e.g., ~/.ssh/id_ed25519)

- **SSH Tunnel settings**:
  - **Local port**: 3307
  - **Remote host**: quiz-database
  - **Remote port**: 3306

### Advanced Settings
- **Auto Sync**: Enabled
- **Keep Alive**: 60 seconds
- **Connect Timeout**: 30 seconds

## Testing Connection

1. Click "Test Connection" to verify settings
2. If connection fails, check error messages:
   - **Authentication failures**: Verify your SSH key is added to Render
   - **Permission denied**: Verify your service is on a paid plan
   - **Connection timeouts**: Try the direct connection method below

## Alternative: Direct Connection

If SSH tunneling doesn't work, you can try direct connection to the external database URL:

- **Host**: quiz-database-8ags.onrender.com
- **Port**: 3306
- **Database**: aischool
- **User**: Sara
- **Password**: Sara0330!!
- **Use SSL**: Checked ✓
- **Require verification of server certificate**: Unchecked

## Database URL

If needed, your full database URL is:

```
mysql://Sara:Sara0330!!@quiz-database-8ags.onrender.com:3306/aischool
``` 