import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const AdminDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Welcome, {user.firstName} {user.lastName}!
        </h1>
        <p className="text-gray-600">Admin Dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Manage Users</h3>
          <p className="text-gray-600">View and manage all users</p>
          <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Manage Users
          </button>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Manage Doctors</h3>
          <p className="text-gray-600">View and manage doctors</p>
          <button className="mt-4 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
            Manage Doctors
          </button>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Manage Patients</h3>
          <p className="text-gray-600">View and manage patients</p>
          <button className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">
            Manage Patients
          </button>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">System Reports</h3>
          <p className="text-gray-600">View system analytics and reports</p>
          <button className="mt-4 bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700">
            View Reports
          </button>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Assignments</h3>
          <p className="text-gray-600">Manage patient-doctor assignments</p>
          <button className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
            Manage Assignments
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
