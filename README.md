# Calm Typing - Server Setup

A calming typing experience with server-side authentication and data persistence, optimized for Render deployment.

## 🌐 Live Demo

[![Render](https://img.shields.io/badge/Render-Deployed-brightgreen)](https://calm-typing-backend.onrender.com)
[![Node.js](https://img.shields.io/badge/Node.js-25.0.0-green)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue)](https://postgresql.org/)

### 🚀 [**Try Calm Typing Live**](https://calm-typing-backend.onrender.com)

*Experience the full typing application with user authentication, data persistence, and all features!*

### 🔗 Quick Links
- **Main App**: [https://calm-typing-backend.onrender.com](https://calm-typing-backend.onrender.com)
- **Admin Dashboard**: [https://calm-typing-backend.onrender.com/api/admin/users](https://calm-typing-backend.onrender.com/api/admin/users)
- **Health Check**: [https://calm-typing-backend.onrender.com/api/health](https://calm-typing-backend.onrender.com/api/health)

## Features

- **User Authentication**: Sign up, sign in, or continue as guest
- **Data Persistence**: Typing history and settings saved to server
- **Guest Sessions**: Temporary sessions for users who don't want to register
- **Auto-correction**: AI-powered word correction using DeepSeek API
- **Customizable Interface**: Fonts, colors, backgrounds, and audio
- **Responsive Design**: Works on desktop and mobile devices

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy the example environment file and update the values:

```bash
cp env.example .env
```

Update the `.env` file with your configuration:

```env
PORT=3000
NODE_ENV=production
SESSION_SECRET=your-super-secret-session-key
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=https://your-app-name.onrender.com
```

### 3. Run Locally

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

## Render Deployment

### 1. Connect to Render

1. Push your code to GitHub
2. Connect your GitHub repository to Render
3. Create a new Web Service

### 2. Render Configuration

Use these settings in Render:

- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment**: `Node`
- **Plan**: Free (or higher for production)

### 3. Environment Variables

Set these environment variables in Render:

```
NODE_ENV=production
SESSION_SECRET=your-super-secret-session-key
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=https://your-app-name.onrender.com
```

### 4. Automatic Deployment

The `render.yaml` file is included for automatic deployment configuration.

## API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/guest` - Create guest session

### User Data

- `GET /api/user/data/:dataType` - Get user data (requires authentication)
- `POST /api/user/data/:dataType` - Save user data (requires authentication)

### Guest Data

- `GET /api/guest/data/:dataType` - Get guest data
- `POST /api/guest/data/:dataType` - Save guest data

### Health Check

- `GET /api/health` - Server health status

## Data Types

- `typing_history` - User's typing history
- `settings` - User preferences (font, color, volume, etc.)
- `audio_tracks` - Custom audio track assignments

## Database

The application uses SQLite for data storage. The database file (`calm-typing.db`) is automatically created on first run.

### Tables

- `users` - User accounts
- `user_data` - User-specific data storage
- `guest_sessions` - Temporary guest sessions

## Security Features

- **Helmet.js** - Security headers
- **Rate Limiting** - API request limiting
- **CORS** - Cross-origin resource sharing
- **JWT Tokens** - Secure authentication
- **Password Hashing** - bcrypt with salt rounds
- **Session Management** - Secure session handling

## Frontend Integration

The application includes:

- **Authentication UI** (`auth.html`) - Sign in/up interface
- **Main App** (`index.html`) - Typing interface with server integration
- **Responsive Design** - Works on all devices

## Development

### Local Development

1. Install dependencies: `npm install`
2. Set up environment variables
3. Run with auto-restart: `npm run dev`
4. Access at `http://localhost:3000`

### Testing

The application includes health check endpoints for monitoring:

- `GET /api/health` - Returns server status

## File Structure

```
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── render.yaml            # Render deployment config
├── env.example            # Environment variables template
├── index.html             # Main application
├── auth.html              # Authentication interface
├── config.js              # DeepSeek API configuration
├── script.js              # Additional client-side logic
├── styles.css             # Styling
├── fish.js                # Fish animation effects
└── Audios/                # Audio files directory
```

## Troubleshooting

### Common Issues

1. **Database Connection**: Ensure SQLite is properly installed
2. **CORS Errors**: Check CORS_ORIGIN environment variable
3. **Authentication**: Verify JWT_SECRET is set
4. **Rate Limiting**: Adjust rate limit settings if needed

### Render-Specific

1. **Build Failures**: Check Node.js version compatibility
2. **Environment Variables**: Ensure all required vars are set
3. **Database**: SQLite files persist on Render's filesystem
4. **Logs**: Check Render logs for debugging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review Render documentation
3. Open an issue on GitHub
4. Check server logs in Render dashboard