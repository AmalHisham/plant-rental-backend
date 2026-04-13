# Plant Rental Platform - Backend

Express.js + MongoDB API for the plant rental platform.

## Stack
- **Runtime**: Node.js + TypeScript
- **Framework**: Express
- **Database**: MongoDB
- **Authentication**: JWT + Google OAuth
- **Email**: Nodemailer (Gmail)
- **Validation**: Joi
- **Security**: Helmet

## Setup

### Prerequisites
- Node.js (v16+)
- MongoDB running locally or connection string

### Installation
```bash
npm install
```

### Environment Variables
Create a `.env` file in the backend folder:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/plant-rental
JWT_SECRET=your_secret_key_here
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=Plant Rental <your_gmail@gmail.com>
```

### Run
```bash
npm run dev    # Development (with hot reload)
npm run build  # Build for production
npm start      # Run production build
```

## API Routes

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Plants
- `GET /api/plants` - Get all plants
- `POST /api/plants` - Create new plant (admin only)

## Project Structure
```
app/
├── modules/
│   ├── user/
│   │   ├── controller/
│   │   ├── service/
│   │   ├── models/
│   │   └── routes/
│   └── plant/
│       ├── controller/
│       ├── service/
│       ├── models/
│       └── routes/
└── middlewares/
```

## Database Models
- **User** - Email, password, reset token, role
- **Plant** - Name, price, deposit (30% of price), image, description
