# Healthcare Management System - API Documentation

## Overview
This document provides comprehensive API documentation for the Healthcare Management System backend. The system provides endpoints for managing users, patients, doctors, appointments, medical records, file uploads, and audit logging.

## Base URL
```
http://localhost:3000
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### 1. Authentication (`/api/auth`)

#### Register User
```http
POST /api/auth/register
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "1234567890",
  "role": "patient"
}
```

#### Login
```http
POST /api/auth/login
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Get Profile
```http
GET /api/auth/profile
```
**Headers:** `Authorization: Bearer <token>`

#### Update Profile
```http
PUT /api/auth/profile
```
**Headers:** `Authorization: Bearer <token>`
**Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "1234567890"
}
```

#### Change Password
```http
PUT /api/auth/change-password
```
**Headers:** `Authorization: Bearer <token>`
**Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

### 2. Users (`/api/users`)

#### Get All Users (Admin Only)
```http
GET /api/users?page=1&limit=10&role=patient&search=john
```

#### Get User by ID
```http
GET /api/users/:id
```

#### Update User
```http
PUT /api/users/:id
```

#### Delete User (Admin Only)
```http
DELETE /api/users/:id
```

### 3. Patients (`/api/patients`)

#### Get All Patients
```http
GET /api/patients?page=1&limit=10&gender=male&bloodType=O+
```

#### Get Patient by ID
```http
GET /api/patients/:id
```

#### Create Patient Profile
```http
POST /api/patients
```
**Body:**
```json
{
  "dateOfBirth": "1990-01-01",
  "gender": "male",
  "bloodType": "O+",
  "height": 175,
  "weight": 70,
  "emergencyContactName": "Jane Doe",
  "emergencyContactPhone": "0987654321",
  "emergencyContactRelation": "Spouse",
  "medicalHistory": "No significant medical history",
  "allergies": "None known",
  "currentMedications": "None",
  "insuranceProvider": "Health Insurance Co",
  "insuranceNumber": "INS123456",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "country": "USA"
}
```

#### Update Patient Profile
```http
PUT /api/patients/:id
```

#### Delete Patient Profile (Admin Only)
```http
DELETE /api/patients/:id
```

### 4. Doctors (`/api/doctors`)

#### Get All Doctors
```http
GET /api/doctors?page=1&limit=10&specialization=cardiology&isAvailable=true
```

#### Get Doctor by ID
```http
GET /api/doctors/:id
```

#### Create Doctor Profile
```http
POST /api/doctors
```
**Body:**
```json
{
  "licenseNumber": "MD123456",
  "specialization": "Cardiology",
  "yearsOfExperience": 10,
  "education": "MD from Harvard Medical School",
  "certifications": "Board Certified in Cardiology",
  "hospitalAffiliation": "General Hospital",
  "clinicAddress": "456 Medical Center Dr",
  "consultationFee": 150.00,
  "availableDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
  "availableHours": { "start": "09:00", "end": "17:00" },
  "languages": ["English", "Spanish"],
  "bio": "Experienced cardiologist with 10 years of practice",
  "rating": 4.8,
  "totalReviews": 150,
  "isAvailable": true,
  "maxPatientsPerDay": 20,
  "consultationDuration": 30
}
```

#### Update Doctor Profile
```http
PUT /api/doctors/:id
```

#### Delete Doctor Profile (Admin Only)
```http
DELETE /api/doctors/:id
```

#### Get Doctor's Patients
```http
GET /api/doctors/:id/patients?page=1&limit=10&status=active
```

### 5. Patient-Doctor Relationships (`/api/patient-doctors`)

#### Get All Relationships
```http
GET /api/patient-doctors?page=1&limit=10&patientId=uuid&doctorId=uuid&relationshipType=primary_care
```

#### Get Relationship by ID
```http
GET /api/patient-doctors/:id
```

#### Create Relationship
```http
POST /api/patient-doctors
```
**Body:**
```json
{
  "patientId": "uuid",
  "doctorId": "uuid",
  "relationshipType": "primary_care",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "notes": "Primary care physician relationship",
  "referralReason": "Regular checkup",
  "diagnosis": "Healthy patient",
  "treatmentPlan": "Continue current lifestyle",
  "nextAppointment": "2024-06-01T10:00:00Z",
  "priority": "medium",
  "status": "active"
}
```

#### Update Relationship
```http
PUT /api/patient-doctors/:id
```

#### Delete Relationship
```http
DELETE /api/patient-doctors/:id
```

#### Get Patient's Doctors
```http
GET /api/patient-doctors/patient/:patientId/doctors?status=active
```

#### Get Doctor's Patients
```http
GET /api/patient-doctors/doctor/:doctorId/patients?status=active
```

### 6. Appointments (`/api/appointments`)

#### Get All Appointments
```http
GET /api/appointments?page=1&limit=10&patientId=uuid&doctorId=uuid&status=scheduled&upcoming=true
```

#### Get Appointment by ID
```http
GET /api/appointments/:id
```

#### Create Appointment
```http
POST /api/appointments
```
**Body:**
```json
{
  "patientId": "uuid",
  "doctorId": "uuid",
  "appointmentDate": "2024-06-01T10:00:00Z",
  "duration": 30,
  "type": "consultation",
  "reason": "Regular checkup",
  "symptoms": "No specific symptoms"
}
```

#### Update Appointment
```http
PUT /api/appointments/:id
```

#### Cancel Appointment
```http
PATCH /api/appointments/:id/cancel
```
**Body:**
```json
{
  "cancellationReason": "Patient request"
}
```

#### Confirm Appointment
```http
PATCH /api/appointments/:id/confirm
```

#### Get Doctor Availability
```http
GET /api/appointments/doctor/:doctorId/availability?date=2024-06-01
```

### 7. Medical Records (`/api/medical-records`)

#### Get All Medical Records
```http
GET /api/medical-records?page=1&limit=10&patientId=uuid&doctorId=uuid&recordType=consultation&priority=high
```

#### Get Medical Record by ID
```http
GET /api/medical-records/:id
```

#### Create Medical Record
```http
POST /api/medical-records
```
**Body:**
```json
{
  "patientId": "uuid",
  "doctorId": "uuid",
  "appointmentId": "uuid",
  "recordType": "consultation",
  "title": "Initial Consultation",
  "description": "Patient came in for regular checkup",
  "symptoms": "No specific symptoms reported",
  "diagnosis": "Healthy patient, no immediate concerns",
  "treatment": "Continue current lifestyle",
  "prescription": "No medication required",
  "vitalSigns": {
    "bloodPressure": "120/80",
    "heartRate": 72,
    "temperature": 98.6,
    "weight": 70,
    "height": 175
  },
  "labResults": {
    "bloodSugar": 95,
    "cholesterol": 180
  },
  "imagingResults": {
    "xray": "normal",
    "mri": "no abnormalities"
  },
  "followUpRequired": true,
  "followUpDate": "2024-12-01",
  "followUpNotes": "Schedule follow-up in 6 months",
  "priority": "medium",
  "isConfidential": false,
  "tags": ["checkup", "healthy"]
}
```

#### Update Medical Record
```http
PUT /api/medical-records/:id
```

#### Archive Medical Record
```http
PATCH /api/medical-records/:id/archive
```

#### Get Patient Medical History Summary
```http
GET /api/medical-records/patient/:patientId/summary?months=12
```

#### Get Follow-up Required Records
```http
GET /api/medical-records/follow-up/required?page=1&limit=10&overdue=false
```

### 8. File Uploads (`/api/upload`)

#### Upload Single Medical Document
```http
POST /api/upload/medical-document
```
**Content-Type:** `multipart/form-data`
**Body:** Form data with `medicalDocument` field

#### Upload Multiple Medical Documents
```http
POST /api/upload/medical-documents
```
**Content-Type:** `multipart/form-data`
**Body:** Form data with `medicalDocuments` field (array)

#### Upload Lab Results
```http
POST /api/upload/lab-results
```
**Content-Type:** `multipart/form-data`
**Body:** Form data with `labResults` field (array)

#### Upload Imaging Files
```http
POST /api/upload/imaging
```
**Content-Type:** `multipart/form-data`
**Body:** Form data with `imaging` field (array)

#### Upload Prescription
```http
POST /api/upload/prescription
```
**Content-Type:** `multipart/form-data`
**Body:** Form data with `prescription` field

#### Upload Profile Image
```http
POST /api/upload/profile-image
```
**Content-Type:** `multipart/form-data`
**Body:** Form data with `profileImage` field

#### Upload Files for Medical Record
```http
POST /api/upload/medical-record/:recordId
```
**Content-Type:** `multipart/form-data`
**Body:** Form data with multiple file fields

#### Delete File
```http
DELETE /api/upload/:filename
```

#### Get File Info
```http
GET /api/upload/info/:filename
```

#### List Uploaded Files
```http
GET /api/upload/list?page=1&limit=20&type=medical-documents
```

### 9. Audit Logs (`/api/audit`)

#### Get Audit Logs (Admin Only)
```http
GET /api/audit?page=1&limit=50&userId=uuid&action=login&category=authentication&severity=high
```

#### Get Security Events (Admin Only)
```http
GET /api/audit/security?page=1&limit=50&severity=high&category=authentication
```

#### Get Failed Login Attempts (Admin Only)
```http
GET /api/audit/failed-logins?page=1&limit=50&ipAddress=192.168.1.1
```

#### Get Audit Log by ID (Admin Only)
```http
GET /api/audit/:id
```

#### Get Audit Statistics (Admin Only)
```http
GET /api/audit/stats/overview?days=30
```

#### Get User Activity (Admin Only)
```http
GET /api/audit/user/:userId/activity?page=1&limit=50&days=30
```

#### Export Audit Logs (Admin Only)
```http
GET /api/audit/export/csv?dateFrom=2024-01-01&dateTo=2024-12-31&category=authentication
```

### 10. Health Check

#### Health Check
```http
GET /health
```

## Response Format

All API responses follow this format:

### Success Response
```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": {
    // Response data
  },
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "pages": 10
  }
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `500` - Internal Server Error

## File Upload Limits

- **Maximum file size:** 10MB
- **Maximum files per request:** 5
- **Allowed file types:**
  - Medical Documents: PDF, DOC, DOCX, TXT, JPEG, PNG, GIF
  - Lab Results: PDF, JPEG, PNG, TXT, XLS, XLSX
  - Imaging: JPEG, PNG, GIF, BMP, TIFF, DICOM
  - Prescriptions: PDF, JPEG, PNG, TXT
  - Profile Images: JPEG, PNG, GIF

## Rate Limiting

- **Rate limit:** 100 requests per 15 minutes per IP
- **Burst limit:** 10 requests per second

## Security Features

- JWT token authentication
- Role-based access control
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration
- Rate limiting
- Audit logging
- File upload validation

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/healthcare_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=healthcare_db
DB_USER=username
DB_PASSWORD=password

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000

# Email
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@healthcare.com
FRONTEND_URL=http://localhost:3001

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

## Testing

Run the comprehensive test suite:
```bash
node test-new-features.js
```

This will test all the new features including:
- Patient-Doctor relationships
- Appointment scheduling
- Medical records
- File uploads
- Audit logging
- Email notifications (service ready)
