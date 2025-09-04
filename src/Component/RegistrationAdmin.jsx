import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faTimesCircle,
  faSyncAlt,
  faFileAlt,
  faEdit,
  faTrash,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";

const LeaderAdmin = () => {
  const apiUrl = "http://localhost:5000/api/leaders";
  const [leaders, setLeaders] = useState([]);
  const [filteredLeaders, setFilteredLeaders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentLeader, setCurrentLeader] = useState({
    id: "",
    fullName: "",
    regNumber: "",
    school: "",
    position: "",
    phone: "",
    email: "",
    yearOfStudy: "",
    status: "pending",
  });

  useEffect(() => {
    fetchLeaders();
  }, []);

  useEffect(() => {
    const filtered = leaders.filter(
      (leader) =>
        leader.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        leader.regNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        leader.school?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        leader.position?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredLeaders(filtered);
  }, [searchTerm, leaders]);

  const fetchLeaders = async () => {
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      const data = await response.json();
      if (!Array.isArray(data.leaders)) {
        throw new Error("Invalid data format received");
      }
      setLeaders(data.leaders);
      setFilteredLeaders(data.leaders);
    } catch (error) {
      console.error("Error loading leaders:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const approveLeader = async (leaderId) => {
    try {
      const response = await fetch(`${apiUrl}/approve/${leaderId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Approval failed: ${response.status}`
        );
      }

      const result = await response.json();
      fetchLeaders(); // Refresh the list
      alert(result.message || "Leader approved successfully");
    } catch (error) {
      console.error("Approval error:", error);
      alert(`Approval failed: ${error.message}`);
    }
  };

  const rejectLeader = async (id) => {
    if (
      !window.confirm("Are you sure you want to reject and delete this leader?")
    )
      return;

    try {
      const response = await fetch(`${apiUrl}/reject/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Rejection failed: ${response.status}`
        );
      }

      const result = await response.json();
      fetchLeaders(); // Refresh the list
      alert(result.message || "Leader rejected and removed successfully");
    } catch (error) {
      console.error("Rejection error:", error);
      alert(`Rejection failed: ${error.message}`);
    }
  };

  const openEditModal = async (id) => {
    try {
      const leader = leaders.find((l) => l.id === id);
      if (leader) {
        setCurrentLeader({
          id: leader.id,
          fullName: leader.fullName || "",
          regNumber: leader.regNumber || "",
          school: leader.school || "",
          position: leader.position || "",
          phone: leader.phone || "",
          email: leader.email || "",
          yearOfStudy: leader.yearOfStudy || "",
          status: leader.status || "pending",
        });
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error("Error opening edit modal:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiUrl}/update/${currentLeader.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: currentLeader.fullName,
          school: currentLeader.school,
          position: currentLeader.position,
          phone: currentLeader.phone,
          email: currentLeader.email,
          yearOfStudy: currentLeader.yearOfStudy,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Update failed: ${response.status}`);
      }

      const result = await response.json();
      setIsModalOpen(false);
      fetchLeaders(); // Refresh the list
      alert(result.message || "Leader updated successfully");
    } catch (error) {
      console.error("Update error:", error);
      alert(`Update failed: ${error.message}`);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentLeader((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRefresh = () => {
    setSearchTerm("");
    fetchLeaders();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return (
          <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
            Approved
          </span>
        );
      case "rejected":
        return (
          <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
            Rejected
          </span>
        );
      default:
        return (
          <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Leaders Management
          </h1>
          <a
            href="/voteadmin-page"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            See votes
          </a>
        </div>

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center">
              <input
                type="text"
                placeholder="Search leaders..."
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button
                onClick={handleRefresh}
                className="ml-4 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
              >
                <FontAwesomeIcon icon={faSyncAlt} className="mr-2" />
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Full Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reg Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    School
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
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
                {filteredLeaders.length > 0 ? (
                  filteredLeaders.map((leader) => (
                    <tr key={leader.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {leader.id || ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {leader.fullName || ""}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {leader.regNumber || ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {leader.school || ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {leader.position || ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {leader.phone || ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(leader.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {leader.status === "pending" && (
                          <button
                            onClick={() => approveLeader(leader.id)}
                            className="text-green-600 hover:text-green-900 mr-3"
                            title="Approve"
                          >
                            <FontAwesomeIcon icon={faCheckCircle} />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(leader.id)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Edit"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button
                          onClick={() => rejectLeader(leader.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Reject & Delete"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-6 py-4 text-center text-sm text-gray-500"
                    >
                      No leaders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Showing {filteredLeaders.length} of {leaders.length} leaders
            </div>
          </div>
        </div>
      </div>

      {/* Edit Leader Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Edit Leader
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Close modal"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <form onSubmit={handleEditSubmit}>
                <div className="mb-4">
                  <label
                    htmlFor="editName"
                    className="block text-gray-700 font-semibold mb-2"
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="editName"
                    name="fullName"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={currentLeader.fullName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label
                    htmlFor="editRegNumber"
                    className="block text-gray-700 font-semibold mb-2"
                  >
                    Registration Number
                  </label>
                  <input
                    type="text"
                    id="editRegNumber"
                    name="regNumber"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                    value={currentLeader.regNumber}
                    onChange={handleInputChange}
                    disabled
                    readOnly
                  />
                </div>
                <div className="mb-4">
                  <label
                    htmlFor="editSchool"
                    className="block text-gray-700 font-semibold mb-2"
                  >
                    School
                  </label>
                  <select
                    id="editSchool"
                    name="school"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={currentLeader.school}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select School</option>
                    <option value="School of Business and Economics">
                      School of Business and Economics
                    </option>
                    <option value="School of Pure and Applied Science">
                      School of Pure and Applied Science
                    </option>
                    <option value="School of Education Arts">
                      School of Education Arts
                    </option>
                    <option value="School of Education Science">
                      School of Education Science
                    </option>
                  </select>
                </div>
                <div className="mb-4">
                  <label
                    htmlFor="editPosition"
                    className="block text-gray-700 font-semibold mb-2"
                  >
                    Position
                  </label>
                  <select
                    id="editPosition"
                    name="position"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={currentLeader.position}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Position</option>
                    <option value="ChairPerson">ChairPerson</option>
                    <option value="Vice ChairPerson">Vice ChairPerson</option>
                    <option value="Secretary General">Secretary General</option>
                    <option value="Finance Secretary">Finance Secretary</option>
                    <option value="Academic Director">Academic Director</option>
                    <option value="Sport/Entertainment Director">
                      Sport/Entertainment Director
                    </option>
                    <option value="WellFair Director">WellFair Director</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label
                    htmlFor="editPhone"
                    className="block text-gray-700 font-semibold mb-2"
                  >
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="editPhone"
                    name="phone"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={currentLeader.phone}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="mb-4">
                  <label
                    htmlFor="editEmail"
                    className="block text-gray-700 font-semibold mb-2"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="editEmail"
                    name="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={currentLeader.email}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="mb-4">
                  <label
                    htmlFor="editYearOfStudy"
                    className="block text-gray-700 font-semibold mb-2"
                  >
                    Year of Study
                  </label>
                  <input
                    type="text"
                    id="editYearOfStudy"
                    name="yearOfStudy"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={currentLeader.yearOfStudy}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="mt-6">
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                  >
                    Update Leader
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaderAdmin;
