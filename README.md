# Personal Dashboard - Expense Tracker & Life Manager

A comprehensive personal dashboard application that helps you manage expenses, daily routines, meal planning, notes, todos, and split bills with friends.

## ✨ Features

- **💰 Expense Tracking**: Monitor monthly spending with visual progress bars
- **📅 Daily Routine Management**: Create and track daily tasks and routines
- **🍽️ Meal Planner**: Plan weekly meals with easy-to-use interface
- **📝 Quick Notes**: Jot down important information
- **✅ Todo Lists**: Manage tasks and track completion
- **👥 Split Bills**: Calculate and track shared expenses with friends
- **🌤️ Weather Updates**: Real-time weather information
- **🔐 Secure Authentication**: User registration and login system
- **📱 Responsive Design**: Works on desktop and mobile devices

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd expense-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Database Setup**
   ```bash
   # Create MySQL database
   mysql -u root -p
   CREATE DATABASE personal_dashboard;
   USE personal_dashboard;
   
   # Import the database schema
   mysql -u root -p personal_dashboard < one.sql
   ```

4. **Configuration**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your database credentials
   nano .env
   ```

5. **Start the application**
   ```bash
   npm start
   ```

6. **Access the application**
   - Open your browser and go to `http://localhost:3000`
   - Default login: `prajwal` / `1234`

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=personal_dashboard
SESSION_SECRET=your_very_secure_session_secret
WEATHER_API_KEY=your_openweathermap_api_key
```

### Database Configuration

The application uses MySQL with the following tables:
- `users` - User authentication
- `expenses` - Expense tracking
- `daily_routine` - Daily tasks and routines
- `meals` - Meal planning
- `notes` - Quick notes
- `todos` - Task management
- `split_bills` - Bill splitting with friends

## 🛠️ Development

### Project Structure

```
expense-tracker/
├── server.js          # Express server and API endpoints
├── main.js           # Frontend JavaScript with animations
├── index.html        # Main dashboard
├── login.html        # Login page
├── register.html     # Registration page
├── expenses.html     # Expense management
├── daily-routine.html # Routine management
├── meal-planner.html # Meal planning
├── notes.html        # Notes management
├── todo.html         # Todo management
├── split-bills.html  # Bill splitting
├── weather.html      # Weather information
├── style.css         # Main stylesheet
├── one.sql           # Database schema
├── package.json      # Dependencies
└── README.md         # This file
```

### Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with nodemon

### API Endpoints

All API endpoints require authentication except `/api/login` and `/api/register`.

- `POST /api/login` - User authentication
- `POST /api/register` - User registration
- `POST /api/logout` - User logout
- `GET/POST/PUT/DELETE /api/expenses` - Expense management
- `GET/POST/PUT/DELETE /api/routines` - Routine management
- `GET/POST/PUT/DELETE /api/meals` - Meal planning
- `GET/POST/PUT/DELETE /api/notes` - Notes management
- `GET/POST/PUT/DELETE /api/todos` - Todo management
- `GET/POST/DELETE /api/bills` - Bill splitting

## 🔒 Security Features

- **Input Validation**: All user inputs are validated and sanitized
- **SQL Injection Protection**: Parameterized queries prevent SQL injection
- **Session Security**: Secure session configuration with httpOnly cookies
- **Password Hashing**: Bcrypt with salt rounds for secure password storage
- **Authentication Middleware**: Protected routes require valid sessions
- **CSRF Protection**: Built-in protection against cross-site request forgery

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify MySQL is running
   - Check database credentials in config
   - Ensure database exists

2. **Port Already in Use**
   - Change PORT in config or environment
   - Kill existing process using the port

3. **Authentication Issues**
   - Clear browser cookies
   - Check session configuration
   - Verify user exists in database

4. **Weather API Not Working**
   - Check internet connection
   - Verify API key is valid
   - Check API rate limits

### Error Logs

Check the console output for detailed error messages. The application logs:
- Database connection status
- API request/response details
- Authentication attempts
- Error details with stack traces

## 📱 Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers (responsive design)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:

1. Check the troubleshooting section
2. Review error logs in the console
3. Verify your configuration
4. Create an issue with detailed error information

## 🔄 Updates

The application automatically:
- Creates default user on first run
- Handles database connection errors gracefully
- Provides fallback UI for failed API calls
- Shows user-friendly error messages

---

**Happy Organizing! 🎉**
