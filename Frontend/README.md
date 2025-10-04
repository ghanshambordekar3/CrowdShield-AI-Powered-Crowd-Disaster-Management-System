# CrowdShield Frontend

> AI-Powered Crowd & Disaster Management System - Progressive Web Application

## 📋 Project Overview

CrowdShield Frontend is a modern, responsive Progressive Web Application (PWA) designed for real-time crowd monitoring and disaster management. The application provides an intuitive interface for monitoring crowd density, managing alerts, viewing safe routes, and coordinating emergency responses during large-scale events and disasters.

## 🚀 Tech Stack

- **HTML5** - Semantic markup and structure
- **CSS3** - Modern styling with animations and responsive design
- **JavaScript (ES6+)** - Interactive functionality and API integration
- **Leaflet.js** - Interactive mapping and geolocation
- **Font Awesome** - Icon library
- **PWA** - Progressive Web App capabilities with service worker

## ✨ Key Features

### 🎯 Core Functionality
- **Real-time Crowd Monitoring** - Live heatmap visualization of crowd density across different zones
- **AI-Powered Alerts** - Intelligent alert system for crowd management and emergency situations
- **Safe Route Navigation** - Dynamic route suggestions based on current crowd conditions
- **SMS Emergency Broadcast** - Quick communication system for emergency notifications
- **Alert History Tracking** - Comprehensive log of all alerts and responses
- **Offline Support** - PWA capabilities for offline functionality

### 📱 Progressive Web App Features
- Installable on mobile and desktop devices
- Offline functionality with service worker
- Push notifications support
- Responsive design for all screen sizes
- App-like experience with custom splash screen

## 📁 Folder Structure

```
Frontend/
├── CSS/
│   └── style.css              # Main stylesheet with animations and responsive design
├── JS/
│   ├── script.js              # Core application logic and API integration
│   └── sw.js                  # Service worker for PWA functionality
├── index.html                 # Main dashboard page
├── alert-history.html         # Alert history and logs page
├── send-sms.html              # SMS broadcast interface
└── manifest.json              # PWA manifest configuration
```

## 🛠️ Local Development

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, or Edge)
- Local web server (optional but recommended)

### Running Locally

#### Option 1: Using Python's Built-in Server
```bash
# Navigate to the Frontend directory
cd Frontend

# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

Then open `http://localhost:8000` in your browser.

#### Option 2: Using Node.js http-server
```bash
# Install http-server globally (one-time)
npm install -g http-server

# Navigate to the Frontend directory
cd Frontend

# Start the server
http-server -p 8000
```

Then open `http://localhost:8000` in your browser.

#### Option 3: Using VS Code Live Server
1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

### Backend Configuration

The frontend connects to the Spring Boot backend API. Update the API endpoint in `JS/script.js` if needed:

```javascript
const API_BASE_URL = 'http://localhost:8080/api';
```

## 🌐 Deployment

### Deploying to Vercel / Render

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Navigate to Frontend directory**:
   ```bash
   cd Frontend
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Follow the prompts**:
   - Set up and deploy: Yes
   - Which scope: Select your account
   - Link to existing project: No
   - Project name: crowdshield-frontend (or your preferred name)
   - Directory: ./
   - Override settings: No

5. **Production Deployment**:
   ```bash
   vercel --prod
   ```

### Deployment Configuration

Create a `vercel.json` file in the Frontend directory for custom configuration:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "**/*",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

### Environment Variables

For production deployment, update the API endpoint in your code or use environment-specific configuration:

```javascript
const API_BASE_URL = process.env.API_URL || 'https://your-backend-api.com/api';
```

## 🔗 Deployment URL

**Live Application**: `https://crowd-shield-ai-powered-crowd-disas-delta.vercel.app/`

## 🎨 Features Breakdown

### Dashboard (index.html)
- Real-time crowd density heatmap
- Live statistics and metrics
- Active alerts display
- Safe route recommendations
- System status indicators

### Alert History (alert-history.html)
- Comprehensive alert logs
- Filter and search functionality
- Alert status tracking
- Response time analytics

### SMS Broadcast (send-sms.html)
- Emergency message composition
- Recipient selection
- Broadcast history
- Message templates

## 🔧 Configuration

### PWA Manifest
Edit `manifest.json` to customize:
- App name and description
- Theme colors
- Icons
- Display mode
- Start URL

### Service Worker
Modify `JS/sw.js` to configure:
- Cache strategies
- Offline resources
- Background sync
- Push notifications

## 📱 Browser Support

- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Opera
- ⚠️ Internet Explorer (Limited support)

## 🚀 Future Improvements

### Planned Features
- [ ] Multi-language support (i18n)
- [ ] Advanced analytics dashboard
- [ ] Real-time video feed integration
- [ ] Machine learning-based crowd prediction
- [ ] Integration with IoT sensors
- [ ] Voice command support
- [ ] AR-based navigation
- [ ] Social media integration for alerts
- [ ] Weather data integration
- [ ] Historical data visualization

### Technical Enhancements
- [ ] TypeScript migration
- [ ] React/Vue.js framework integration
- [ ] GraphQL API integration
- [ ] WebSocket for real-time updates
- [ ] Enhanced PWA features (background sync, periodic sync)
- [ ] Performance optimization
- [ ] Accessibility improvements (WCAG 2.1 AA compliance)
- [ ] Unit and integration testing
- [ ] CI/CD pipeline setup

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is part of a hackathon submission. Please refer to the main project repository for licensing information.

---

## 👥 Contact

### Developers

**Ghansham Bordekar**
- GitHub: [@ghanshambordekar3](https://github.com/ghanshambordekar3)
- LinkedIn: [Ghansham Bordekar](https://www.linkedin.com/in/ghansham-bordekar)
- Instagram: [@sh_y_am_3](https://instagram.com/sh_y_am_3)
- WhatsApp: [+91 88498 26386](https://wa.me/8849826386)

**Vaibhav Ingle**
- GitHub: [@Vaibhav01-bit](https://github.com/Vaibhav01-bit)
- LinkedIn: [Vaibhav Ingle](https://www.linkedin.com/in/vaibhav-ingle-649bb8253)
- Instagram: [@Vaibhavingle07](https://instagram.com/Vaibhavingle07)
- WhatsApp: [+91 87672 08015](https://wa.me/8767208015)

---

## 👥 Team

CrowdShield Development Team - Hackathon Project

## 📞 Support

For issues, questions, or suggestions, please open an issue in the repository or contact the development team.

---

**Built with ❤️ for safer crowd management and disaster response**