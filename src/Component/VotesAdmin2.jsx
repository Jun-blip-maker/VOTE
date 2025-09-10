import React, { useState, useEffect } from "react";
import {
  FaUsers,
  FaChartLine,
  FaFlask,
  FaGraduationCap,
  FaRedo,
  FaClock,
} from "react-icons/fa";

const API_CONFIG = {
  BASE_URL: "http://localhost:5000",
  ENDPOINTS: {
    RESULTS: "/api/results",
    VOTES: "/api/debug/all-data",
    CANDIDATES: "/api/candidates",
    VOTER_RECORDS: "/api/voter-records",
  },
};

const VotesAdmin2 = () => {
  const [votesData, setVotesData] = useState({});
  const [candidates, setCandidates] = useState([]);
  const [voterRecords, setVoterRecords] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch data from server
  const fetchData = async () => {
    try {
      const [resultsData, votesData, candidatesData, voterRecordsData] =
        await Promise.all([
          fetchResults(),
          fetchVotesData(),
          fetchCandidates(),
          fetchVoterRecords(),
        ]);

      setVotesData(votesData);
      setCandidates(candidatesData);
      setVoterRecords(voterRecordsData);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async () => {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.RESULTS}`
      );
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Error fetching results:", error);
      throw error;
    }
  };

  const fetchVotesData = async () => {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VOTES}`
      );
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Error fetching votes data:", error);
      throw error;
    }
  };

  const fetchCandidates = async () => {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CANDIDATES}`
      );
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Error fetching candidates:", error);
      throw error;
    }
  };

  const fetchVoterRecords = async () => {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VOTER_RECORDS}`
      );
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      console.log("Voter records data:", data);
      return data.voter_records || [];
    } catch (error) {
      console.error("Error fetching voter records:", error);
      throw error;
    }
  };

  // Calculate school totals from candidates
  const calculateSchoolTotals = () => {
    const schools = {
      "School of Business and Economics": 0,
      "School of Pure and Applied Science": 0,
      "School of Education Art": 0,
      "School of Education Science": 0,
    };

    candidates.forEach((candidate) => {
      const school = candidate.faculty;
      if (school && schools.hasOwnProperty(school)) {
        schools[school] += candidate.votes || 0;
      }
    });

    return schools;
  };

  // Format date time
  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";

    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch (error) {
      return dateString;
    }
  };

  // Auto-refresh data
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error)
    return (
      <div className="text-red-500 text-center py-8">
        Error: {error}
        <button
          onClick={fetchData}
          className="ml-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Retry
        </button>
      </div>
    );

  const schoolTotals = calculateSchoolTotals();
  const totalVotes = votesData.total_votes || 0;

  return (
    <div className="bg-gray-100 min-h-screen">
      <nav
        className="text-white shadow-lg"
        style={{ backgroundColor: "#008800" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold">
                School Delegates Voting Admin
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchData}
                className="bg-white text-green-800 px-3 py-1 rounded text-sm hover:bg-green-100 flex items-center"
              >
                <FaRedo className="mr-1" /> Refresh
              </button>
              <span className="text-sm">
                Total Votes: {totalVotes} | Voters:{" "}
                {Array.isArray(voterRecords) ? voterRecords.length : 0}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-800 text-center mb-8">
          School Delegates Voting Results
        </h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500">Total Votes</p>
                <h3 className="text-2xl font-bold">{totalVotes}</h3>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <FaUsers className="text-blue-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500">Business & Economics</p>
                <h3 className="text-2xl font-bold">
                  {schoolTotals["School of Business and Economics"] || 0}
                </h3>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <FaChartLine className="text-green-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500">Pure & Applied Science</p>
                <h3 className="text-2xl font-bold">
                  {schoolTotals["School of Pure and Applied Science"] || 0}
                </h3>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <FaFlask className="text-purple-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500">Education</p>
                <h3 className="text-2xl font-bold">
                  {(schoolTotals["School of Education Art"] || 0) +
                    (schoolTotals["School of Education Science"] || 0)}
                </h3>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <FaGraduationCap className="text-yellow-600 text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* School Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Business & Economics */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-blue-600 px-4 py-3">
              <h3 className="text-lg font-semibold text-white">
                Business & Economics
              </h3>
            </div>
            <div className="p-4">
              <p className="text-2xl font-bold text-center">
                {schoolTotals["School of Business and Economics"] || 0} votes
              </p>
            </div>
          </div>

          {/* Pure & Applied Science */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-purple-600 px-4 py-3">
              <h3 className="text-lg font-semibold text-white">
                Pure & Applied Science
              </h3>
            </div>
            <div className="p-4">
              <p className="text-2xl font-bold text-center">
                {schoolTotals["School of Pure and Applied Science"] || 0} votes
              </p>
            </div>
          </div>

          {/* Education Arts */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-yellow-600 px-4 py-3">
              <h3 className="text-lg font-semibold text-white">
                Education Arts
              </h3>
            </div>
            <div className="p-4">
              <p className="text-2xl font-bold text-center">
                {schoolTotals["School of Education Art"] || 0} votes
              </p>
            </div>
          </div>

          {/* Education Science */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-red-600 px-4 py-3">
              <h3 className="text-lg font-semibold text-white">
                Education Science
              </h3>
            </div>
            <div className="p-4">
              <p className="text-2xl font-bold text-center">
                {schoolTotals["School of Education Science"] || 0} votes
              </p>
            </div>
          </div>
        </div>

        {/* Candidate Results */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div className="bg-indigo-800 px-4 py-3">
            <h3 className="text-lg font-semibold text-white">
              Candidate Results by School
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    School
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Votes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registration Number
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {candidates
                  .sort((a, b) => (b.votes || 0) - (a.votes || 0))
                  .map((candidate) => (
                    <tr key={candidate.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {candidate.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {candidate.faculty || "Unknown"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {candidate.votes || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {candidate.registration_number}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Voter Records */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div className="bg-gray-800 px-4 py-3">
            <h3 className="text-lg font-semibold text-white">
              Student Voter Records
            </h3>
            <p className="text-gray-300 text-sm">
              Total Students Voted:{" "}
              {Array.isArray(voterRecords) ? voterRecords.length : 0}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vote Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registration Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    School/Faculty
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(voterRecords) && voterRecords.length > 0 ? (
                  voterRecords.map((voter, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <FaClock className="mr-2 text-gray-400" />
                          {formatDateTime(voter.vote_time)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {voter.registration_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {voter.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {voter.faculty || "N/A"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-6 py-4 text-center text-sm text-gray-500"
                    >
                      {Array.isArray(voterRecords)
                        ? "No voting records found"
                        : "Error loading voter records"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Statistics */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div className="bg-green-800 px-4 py-3">
            <h3 className="text-lg font-semibold text-white">
              System Statistics
            </h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Delegates</p>
              <p className="text-2xl font-bold">
                {votesData.delegates_total || 0}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Approved Delegates</p>
              <p className="text-2xl font-bold">
                {votesData.delegates_approved || 0}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Candidates</p>
              <p className="text-2xl font-bold">
                {votesData.candidates_total || 0}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Students Voted</p>
              <p className="text-2xl font-bold">
                {Array.isArray(voterRecords) ? voterRecords.length : 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VotesAdmin2;
