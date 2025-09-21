import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const DoctorDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Welcome, Dr. {user.firstName} {user.lastName}!
        </h1>
        <p className="text-gray-600">Doctor Dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">My Patients</h3>
          <p className="text-gray-600">View and manage your patients</p>
          <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            View Patients
          </button>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Appointments</h3>
          <p className="text-gray-600">Manage your appointments</p>
          <button className="mt-4 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
            View Appointments
          </button>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Medical Records</h3>
          <p className="text-gray-600">Access patient medical records</p>
          <button className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">
            View Records
          </button>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
