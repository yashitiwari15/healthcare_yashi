const User = require('./User');
const Patient = require('./Patient');
const Doctor = require('./Doctor');
const PatientDoctor = require('./PatientDoctor');
const Appointment = require('./Appointment');
const MedicalRecord = require('./MedicalRecord');
// const AuditLog = require('./AuditLog');

// Define associations

// User associations
User.hasOne(Patient, {
  foreignKey: 'userId',
  as: 'patientProfile',
  onDelete: 'CASCADE'
});

User.hasOne(Doctor, {
  foreignKey: 'userId',
  as: 'doctorProfile',
  onDelete: 'CASCADE'
});

// Patient associations
Patient.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

Patient.belongsToMany(Doctor, {
  through: PatientDoctor,
  foreignKey: 'patientId',
  otherKey: 'doctorId',
  as: 'doctors'
});

Patient.hasMany(PatientDoctor, {
  foreignKey: 'patientId',
  as: 'doctorRelationships'
});

// Doctor associations
Doctor.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

Doctor.belongsToMany(Patient, {
  through: PatientDoctor,
  foreignKey: 'doctorId',
  otherKey: 'patientId',
  as: 'patients'
});

Doctor.hasMany(PatientDoctor, {
  foreignKey: 'doctorId',
  as: 'patientRelationships'
});

// PatientDoctor associations
PatientDoctor.belongsTo(Patient, {
  foreignKey: 'patientId',
  as: 'patient'
});

PatientDoctor.belongsTo(Doctor, {
  foreignKey: 'doctorId',
  as: 'doctor'
});

// Appointment associations
Appointment.belongsTo(Patient, {
  foreignKey: 'patientId',
  as: 'patient'
});

Appointment.belongsTo(Doctor, {
  foreignKey: 'doctorId',
  as: 'doctor'
});

Patient.hasMany(Appointment, {
  foreignKey: 'patientId',
  as: 'appointments'
});

Doctor.hasMany(Appointment, {
  foreignKey: 'doctorId',
  as: 'appointments'
});

// MedicalRecord associations
MedicalRecord.belongsTo(Patient, {
  foreignKey: 'patientId',
  as: 'patient'
});

MedicalRecord.belongsTo(Doctor, {
  foreignKey: 'doctorId',
  as: 'doctor'
});

MedicalRecord.belongsTo(Appointment, {
  foreignKey: 'appointmentId',
  as: 'appointment'
});

MedicalRecord.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator'
});

MedicalRecord.belongsTo(User, {
  foreignKey: 'lastModifiedBy',
  as: 'lastModifier'
});

Patient.hasMany(MedicalRecord, {
  foreignKey: 'patientId',
  as: 'medicalRecords'
});

Doctor.hasMany(MedicalRecord, {
  foreignKey: 'doctorId',
  as: 'medicalRecords'
});

Appointment.hasMany(MedicalRecord, {
  foreignKey: 'appointmentId',
  as: 'medicalRecords'
});

// AuditLog associations (disabled)
// AuditLog.belongsTo(User, {
//   foreignKey: 'userId',
//   as: 'user'
// });

// User.hasMany(AuditLog, {
//   foreignKey: 'userId',
//   as: 'auditLogs'
// });

module.exports = {
  User,
  Patient,
  Doctor,
  PatientDoctor,
  Appointment,
  MedicalRecord
  // AuditLog (disabled)
};
