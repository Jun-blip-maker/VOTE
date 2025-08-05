import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faSyncAlt,
  faFileAlt,
  faEdit,
  faTrash,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";

const RegistrationAdmin = () => {
  const apiUrl = "http://localhost:3000/candidates"; // Adjust the URL as needed
  const [applicants, setApplicants] = useState([]);
  const [filteredApplicants, setFilteredApplicants] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentApplicant, setCurrentApplicant] = useState({
    id: "",
    fullName: "",
    regNumber: "",
    school: "",
    position: "",
    transcript: "",
  });

  useEffect(() => {
    fetchApplicants();
  }, []);

  useEffect(() => {
    const filtered = applicants.filter(
      (applicant) =>
        applicant.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        applicant.regNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        applicant.school?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        applicant.position?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredApplicants(filtered);
  }, [searchTerm, applicants]);

  const fetchApplicants = async () => {
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("Invalid data format received");
      }
      setApplicants(data);
      setFilteredApplicants(data);
    } catch (error) {
      console.error("Error loading applicants:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const viewTranscript = (fileUrl) => {
    if (!fileUrl) {
      alert("No transcript file available");
      return;
    }
    alert(
      `Viewing transcript: ${fileUrl}\n\nIn a real application, this would open the file.`
    );
  };

  const deleteApplicant = async (id) => {
    if (!confirm("Are you sure you want to delete this applicant?")) return;
    try {
      const response = await fetch(`${apiUrl}/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`);
      }
      fetchApplicants();
      alert("Applicant deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      alert(`Delete failed: ${error.message}`);
    }
  };

  const openEditModal = async (id) => {
    try {
      const response = await fetch(`${apiUrl}/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch applicant: ${response.status}`);
      }
      const applicant = await response.json();
      setCurrentApplicant(applicant);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error opening edit modal:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiUrl}/${currentApplicant.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(currentApplicant),
      });
      if (!response.ok) {
        throw new Error(`Update failed: ${response.status}`);
      }
      setIsModalOpen(false);
      fetchApplicants();
      alert("Applicant updated successfully");
    } catch (error) {
      console.error("Update error:", error);
      alert(`Update failed: ${error.message}`);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentApplicant((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRefresh = () => {
    setSearchTerm("");
    fetchApplicants();
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Applicants Management
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
                placeholder="Search applicants..."
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
                    Transcript
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApplicants.length > 0 ? (
                  filteredApplicants.map((applicant) => (
                    <tr key={applicant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {applicant.id || ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {applicant.fullName || ""}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {applicant.regNumber || ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {applicant.school || ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {applicant.position || ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {applicant.transcript ? (
                          <button
                            onClick={() => viewTranscript(applicant.transcript)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <FontAwesomeIcon
                              icon={faFileAlt}
                              className="mr-1"
                            />
                            View
                          </button>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openEditModal(applicant.id)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button
                          onClick={() => deleteApplicant(applicant.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-6 py-4 text-center text-sm text-gray-500"
                    >
                      No applicants found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Showing {filteredApplicants.length} of {applicants.length}{" "}
              applicants
            </div>
          </div>
        </div>
      </div>

      {/* Edit Applicant Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Edit Applicant
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleEditSubmit}>
                <input type="hidden" name="id" value={currentApplicant.id} />
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={currentApplicant.fullName}
                    onChange={handleInputChange}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={currentApplicant.regNumber}
                    onChange={handleInputChange}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={currentApplicant.school}
                    onChange={handleInputChange}
                  >
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={currentApplicant.position}
                    onChange={handleInputChange}
                  >
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
                <div className="mt-6">
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md"
                  >
                    Update Applicant
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

export default RegistrationAdmin;
