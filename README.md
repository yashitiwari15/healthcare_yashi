# AI Healthcare Management System

A comprehensive healthcare management system built with Node.js, Express, React, and PostgreSQL. This system provides a complete solution for managing patients, doctors, appointments, and medical records.

## 🚀 Features

### Core Features
- **User Management**: Registration, authentication, and role-based access control
- **Patient Management**: Complete patient profiles with medical history
- **Doctor Management**: Doctor profiles with specializations and availability
- **Appointment Scheduling**: Book and manage appointments
- **Medical Records**: Digital medical records with file attachments
- **Patient-Doctor Relationships**: Manage healthcare provider relationships

### Technical Features
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Admin, Doctor, and Patient roles
- **File Upload Support**: Medical documents and images
- **Email Notifications**: Appointment reminders and notifications
- **RESTful API**: Well-structured API endpoints
- **Database Relationships**: Proper foreign key relationships
- **Input Validation**: Comprehensive data validation
- **Error Handling**: Centralized error handling

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **Sequelize** - ORM
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Multer** - File uploads
- **Nodemailer** - Email service

### Frontend
- **React 18** - UI framework
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Context API** - State management

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** (v16 or higher)
- **PostgreSQL** (v12 or higher)
- **npm** or **yarn**

## 🔧 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ai_healthcare
```

### 2. Install Dependencies

#### Backend Dependencies
```bash
npm install
```

#### Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### 3. Database Setup

#### Install PostgreSQL
- Download and install PostgreSQL from [postgresql.org](https://www.postgresql.org/download/)
- Create a database named `healthcare_db`
- Note your PostgreSQL username and password

#### Configure Environment Variables
Create a `config.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/healthcare_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=healthcare_db
DB_USER=your_username
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:3001

# Email Configuration (Optional)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@healthcare.com
FRONTEND_URL=http://localhost:3001

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

### 4. Database Setup
```bash
# Create database and tables
node setup-database.js
```

## 🚀 Running the Application

### Start the Backend Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

The backend will be available at `http://localhost:3000`

### Start the Frontend
```bash
cd frontend
npm start
```

The frontend will be available at `http://localhost:3001`

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### User Management
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Patient Management
- `GET /api/patients` - Get patients
- `POST /api/patients` - Create patient profile
- `GET /api/patients/:id` - Get patient by ID
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient

### Doctor Management
- `GET /api/doctors` - Get all doctors
- `POST /api/doctors` - Create doctor profile
- `GET /api/doctors/:id` - Get doctor by ID
- `PUT /api/doctors/:id` - Update doctor
- `DELETE /api/doctors/:id` - Delete doctor

### Appointment Management
- `GET /api/appointments` - Get appointments
- `POST /api/appointments` - Create appointment
- `GET /api/appointments/:id` - Get appointment by ID
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Delete appointment

### Medical Records
- `GET /api/medical-records` - Get medical records
- `POST /api/medical-records` - Create medical record
- `GET /api/medical-records/:id` - Get medical record by ID
- `PUT /api/medical-records/:id` - Update medical record

### File Upload
- `POST /api/upload/single` - Upload single file
- `POST /api/upload/multiple` - Upload multiple files
- `DELETE /api/upload/:filename` - Delete file

## 🧪 Testing

Run the test suite:
```bash
# Test backend functionality
node test-new-features.js

# Simple functionality test
node test-simple.js
```

## 🔐 User Roles

### Admin
- Full access to all features
- User management
- System configuration

### Doctor
- Manage patient relationships
- Create medical records
- View assigned patients
- Manage appointments

### Patient
- View own profile
- Book appointments
- View own medical records
- Manage relationships with doctors

## 📁 Project Structure

```
ai_healthcare/
├── src/
│   ├── config/
│   │   └── database.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── upload.js
│   │   └── validation.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Patient.js
│   │   ├── Doctor.js
│   │   ├── Appointment.js
│   │   ├── MedicalRecord.js
│   │   └── index.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── patientRoutes.js
│   │   ├── doctorRoutes.js
│   │   ├── appointmentRoutes.js
│   │   ├── medicalRecordRoutes.js
│   │   └── fileUploadRoutes.js
│   └── services/
│       └── emailService.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── services/
│   │   └── App.js
│   └── package.json
├── uploads/
├── config.env
├── server.js
├── setup-database.js
├── package.json
└── README.md
```

## 🚀 Deployment

### Environment Variables for Production
Make sure to update the following for production:
- `JWT_SECRET` - Use a strong, random secret
- `NODE_ENV=production`
- `DB_PASSWORD` - Use a strong database password
- `CORS_ORIGIN` - Set to your production domain

### Database Migration
```bash
# For production, use migrations instead of force sync
NODE_ENV=production node server.js
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue with detailed information
3. Contact the development team

## 🙏 Acknowledgments

- Express.js community for the excellent framework
- React team for the amazing UI library
- PostgreSQL community for the robust database
- All contributors who helped make this project possible

---
