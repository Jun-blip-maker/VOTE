import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faTimesCircle,
  faSyncAlt,
  faSearch,
} from "@fortawesome/free-solid-svg-icons";

const AdminDelegates = () => {
  const [delegates, setDelegates] = useState([]);
  const [filteredDelegates, setFilteredDelegates] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [facultyFilter, setFacultyFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDelegates();
  }, []);

  useEffect(() => {
    filterDelegates();
  }, [delegates, searchTerm, statusFilter, facultyFilter]);

  const fetchDelegates = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/delegates");
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      const data = await response.json();
      setDelegates(data);
      setLoading(false);
    } catch (error) {
      console.error("Error loading delegates:", error);
      alert(`Error: ${error.message}`);
      setLoading(false);
    }
  };

  const filterDelegates = () => {
    let filtered = delegates;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (delegate) =>
          delegate.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          delegate.registrationNumber
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          delegate.faculty?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      const approvedStatus = statusFilter === "approved";
      filtered = filtered.filter(
        (delegate) => delegate.isApproved === approvedStatus
      );
    }

    // Apply faculty filter
    if (facultyFilter !== "all") {
      filtered = filtered.filter(
        (delegate) => delegate.faculty === facultyFilter
      );
    }

    setFilteredDelegates(filtered);
  };

  const handleApprove = async (id) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/delegates/${id}/approve`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Approval failed: ${response.status}`);
      }

      // Update local state
      setDelegates(
        delegates.map((delegate) =>
          delegate._id === id ? { ...delegate, isApproved: true } : delegate
        )
      );

      alert("Delegate approved successfully");
    } catch (error) {
      console.error("Approval error:", error);
      alert(`Approval failed: ${error.message}`);
    }
  };

  const handleReject = async (id) => {
    if (
      !confirm(
        "Are you sure you want to reject this delegate? This action cannot be undone."
      )
    )
      return;

    try {
      const response = await fetch(
        `http://localhost:5000/api/delegates/${id}/reject`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(`Rejection failed: ${response.status}`);
      }

      // Update local state
      setDelegates(delegates.filter((delegate) => delegate._id !== id));

      alert("Delegate rejected successfully");
    } catch (error) {
      console.error("Rejection error:", error);
      alert(`Rejection failed: ${error.message}`);
    }
  };

  const handleRefresh = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setFacultyFilter("all");
    fetchDelegates();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl font-semibold">Loading delegates...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Delegates Management
          </h1>
          <button
            onClick={handleRefresh}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <FontAwesomeIcon icon={faSyncAlt} className="mr-2" />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white shadow-md rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search delegates..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <FontAwesomeIcon
                  icon={faSearch}
                  className="absolute left-3 top-3 text-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Faculty
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={facultyFilter}
                onChange={(e) => setFacultyFilter(e.target.value)}
              >
                <option value="all">All Faculties</option>
                <option value="Pure and Applied Science">
                  Pure and Applied Science
                </option>
                <option value="Business And Economics">
                  Business And Economics
                </option>
                <option value="Education Arts">Education Arts</option>
                <option value="Education Sciences">Education Sciences</option>
              </select>
            </div>
          </div>
        </div>

        {/* Delegates Table */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reg Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Faculty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDelegates.length > 0 ? (
                  filteredDelegates.map((delegate) => (
                    <tr key={delegate._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {delegate.fullName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {delegate.emailOrPhone}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {delegate.registrationNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {delegate.faculty}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Year {delegate.yearOfStudy}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            delegate.isApproved
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {delegate.isApproved ? "Approved" : "Pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {!delegate.isApproved && (
                          <button
                            onClick={() => handleApprove(delegate._id)}
                            className="text-green-600 hover:text-green-900 mr-3"
                            title="Approve Delegate"
                          >
                            <FontAwesomeIcon icon={faCheckCircle} size="lg" />
                          </button>
                        )}
                        <button
                          onClick={() => handleReject(delegate._id)}
                          className="text-red-600 hover:text-red-900"
                          title="Reject Delegate"
                        >
                          <FontAwesomeIcon icon={faTimesCircle} size="lg" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-4 text-center text-sm text-gray-500"
                    >
                      No delegates found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Showing {filteredDelegates.length} of {delegates.length} delegates
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDelegates;
