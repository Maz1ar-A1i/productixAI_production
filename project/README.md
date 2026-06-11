# Productix AI & Calculation Engine - Frontend

A modern React.js frontend for the Productix AI & Calculation Engine FastAPI backend.

## 🚀 Features

- **Modern UI**: Beautiful gradient dark theme with Tailwind CSS
- **Authentication**: JWT-based login/signup with protected routes
- **Productivity Calculator**: Dynamic input/output forms
- **AI Analysis**: Comprehensive productivity analysis with insights
- **RAG Chatbot**: Interactive chat with productivity data integration
- **AI Agent Reports**: Goal-based report generation
- **Video Upload**: Drag-and-drop video upload with preview
- **Responsive Design**: Works perfectly on desktop and mobile

## 🛠️ Setup & Installation

### Prerequisites
- Node.js 16+ and npm
- FastAPI backend running on `http://127.0.0.1:8000`

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Environment Variables
Copy `.env.example` to `.env` and configure:
```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## 📁 Project Structure

```
src/
├── components/          # Reusable components
│   ├── Navbar.jsx      # Navigation bar
│   ├── VideoUpload.jsx # Video upload component
│   └── ProtectedRoute.jsx # Route protection
├── pages/              # Page components
│   ├── Landing.jsx     # Landing page
│   ├── Login.jsx       # Login page
│   ├── Signup.jsx      # Signup page
│   ├── Dashboard.jsx   # Dashboard
│   ├── Calculate.jsx   # Productivity calculator
│   ├── Analyze.jsx     # AI analysis
│   ├── Chatbot.jsx     # RAG chatbot
│   └── Agent.jsx       # AI agent reports
├── services/           # API services
│   └── api.js         # API configuration and services
├── assets/            # Static assets
└── styles/            # Additional styles
```

## 🔧 Backend Integration

### Required Backend Endpoints
- `POST /signup` - User registration
- `POST /login` - User authentication
- `POST /calculate` - Productivity calculation
- `GET /productivity-records` - Get user's calculation history
- `POST /analyze` - AI analysis
- `POST /chatbot` - RAG chatbot
- `POST /agent` - AI agent reports

### Data Models
The frontend expects these response formats:

**CalculationResponse:**
```json
{
  "combined_productivity": 85.5,
  "single_productivity": 75.2,
  "processed_inputs": ["input1", "input2"],
  "processed_outputs": ["output1", "output2"]
}
```

**AnalysisResponse:**
```json
{
  "efficiency_score": 8.5,
  "ai_prediction": "Your productivity is trending upward...",
  "top_inefficiencies": ["Time management", "Task prioritization"],
  "ai_prescriptions": ["Use time blocking", "Implement GTD method"]
}
```

See `INTEGRATION_CHECKLIST.md` for complete backend integration details.

## 🎨 Styling

- **Tailwind CSS** for utility-first styling
- **Custom gradient theme** with primary/secondary colors
- **Glass morphism effects** for modern UI
- **Responsive breakpoints** for all screen sizes
- **Dark theme** with colorful accents

## 🧪 Testing

### Manual Testing Checklist
1. ✅ Landing page loads with video upload
2. ✅ Signup/Login flow works
3. ✅ Dashboard shows stats and navigation
4. ✅ Calculate page accepts inputs/outputs
5. ✅ Analyze page handles all form fields
6. ✅ Chatbot interface is interactive
7. ✅ Agent page generates reports
8. ✅ Navigation and routing work
9. ✅ Responsive design on mobile

### Error Handling
- Network errors show helpful messages
- Form validation prevents invalid submissions
- JWT token expiration redirects to login
- Graceful fallbacks for missing data

## 🚀 Deployment

### Deploying to Vercel
1. Set the **Root Directory** in your Vercel Project Settings to `project`.
2. Disable the toggle **Include files outside the root directory in the Build Step**.
3. Set the **Framework Preset** to **Vite**.
4. Add the environment variable `VITE_API_BASE_URL` pointing to your Railway backend.

### Build for Production
```bash
npm run build
```

### Environment Variables for Production
```bash
VITE_API_BASE_URL=https://your-api-domain.com
```


## 📋 Backend Integration Checklist

- [ ] FastAPI server running on port 8000
- [ ] CORS configured for frontend domain
- [ ] All required endpoints implemented
- [ ] JWT authentication working
- [ ] Database models match frontend expectations
- [ ] Error responses return proper format

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.