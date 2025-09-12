import React, { useState, useEffect } from "react";
import {
  FaUsers,
  FaChartLine,
  FaFlask,
  FaGraduationCap,
  FaRedo,
  FaExclamationTriangle,
  FaWifi,
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

// Add a function to check if server is available
const checkServerStatus = async () => {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/results`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

const VotesAdmin2 = () => {
  const [votesData, setVotesData] = useState({});
  const [candidates, setCandidates] = useState([]);
  const [voterRecords, setVoterRecords] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverOnline, setServerOnline] = useState(true);

  // Check server status on component mount
  useEffect(() => {
    const checkServer = async () => {
      const isOnline = await checkServerStatus();
      setServerOnline(isOnline);
      if (!isOnline) {
        setError(
          "Cannot connect to server. Please make sure the backend is running on localhost:5000"
        );
        setLoading(false);
      }
    };
    checkServer();
  }, []);

  // Fetch data from server with better error handling
  const fetchData = async () => {
    if (!serverOnline) return;

    try {
      setError(null);

      const [resultsData, votesData, candidatesData, voterRecordsData] =
        await Promise.allSettled([
          fetchResults(),
          fetchVotesData(),
          fetchCandidates(),
          fetchVoterRecords(),
        ]);

      // Handle each response with debug logging
      if (resultsData.status === "fulfilled") {
        setVotesData((prev) => ({ ...prev, ...resultsData.value }));
        console.log("Results data:", resultsData.value);
      } else {
        console.error("Results fetch failed:", resultsData.reason);
      }

      if (votesData.status === "fulfilled") {
        setVotesData((prev) => ({ ...prev, ...votesData.value }));
        console.log("Votes data:", votesData.value);
      } else {
        console.error("Votes data fetch failed:", votesData.reason);
      }

      if (candidatesData.status === "fulfilled") {
        setCandidates(candidatesData.value);
        console.log("Candidates data:", candidatesData.value);
      } else {
        console.error("Candidates fetch failed:", candidatesData.reason);
      }

      if (voterRecordsData.status === "fulfilled") {
        setVoterRecords(voterRecordsData.value.voter_records || []);
        console.log("Voter records data:", voterRecordsData.value);
      } else {
        console.error("Voter records fetch failed:", voterRecordsData.reason);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      if (err.message.includes("Failed to fetch")) {
        setError(
          "Cannot connect to server. Please make sure the backend is running."
        );
        setServerOnline(false);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchWithTimeout = (url, options = {}, timeout = 10000) => {
    return Promise.race([
      fetch(url, options),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), timeout)
      ),
    ]);
  };

  const fetchResults = async () => {
    const response = await fetchWithTimeout(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.RESULTS}`
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  };

  const fetchVotesData = async () => {
    const response = await fetchWithTimeout(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VOTES}`
    ); // Fixed missing closing parenthesis
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  };

  const fetchCandidates = async () => {
    const response = await fetchWithTimeout(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CANDIDATES}`
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  };

  const fetchVoterRecords = async () => {
    const response = await fetchWithTimeout(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VOTER_RECORDS}`
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  };

  // Calculate school totals based on votes for candidates from each school
  const calculateSchoolTotals = () => {
    const schools = {
      "School of Business and Economics": 0,
      "School of Pure and Applied Science": 0,
      "School of Education Art": 0,
      "School of Education Science": 0,
    };

    candidates.forEach((candidate) => {
      let school = candidate.faculty;
      // Map faculty names to match UI format
      if (school === "Business And Economics")
        school = "School of Business and Economics";
      if (school === "Education Sciences")
        school = "School of Education Science";
      if (school === "School of Education Art")
        school = "School of Education Art"; // Already matches
      if (school === "School of Pure and Applied Science")
        school = "School of Pure and Applied Science"; // Already matches

      if (school && schools.hasOwnProperty(school)) {
        schools[school] += candidate.votes || 0;
      }
    });

    return schools;
  };

  // Auto-refresh data only if server is online
  useEffect(() => {
    if (serverOnline) {
      fetchData();
      const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [serverOnline]);

  // Server offline message component
  if (!serverOnline) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-md">
          <FaWifi className="text-4xl text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Server Offline
          </h2>
          <p className="text-gray-600 mb-4">
            Cannot connect to the voting server. Please make sure:
          </p>
          <ul className="text-left text-gray-600 mb-6 space-y-2">
            <li>• The Flask backend is running on port 5000</li>
            <li>• You have an active internet connection</li>
            <li>• There are no firewall restrictions</li>
          </ul>
          <button
            onClick={async () => {
              const isOnline = await checkServerStatus();
              setServerOnline(isOnline);
              if (isOnline) fetchData();
            }}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
          >
            <FaRedo className="inline mr-2" /> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading voting data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-md">
          <FaExclamationTriangle className="text-4xl text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
          >
            <FaRedo className="inline mr-2" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const schoolTotals = calculateSchoolTotals();
  const totalVotes = Object.values(schoolTotals).reduce(
    (sum, votes) => sum + votes,
    0
  );
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
              <span className="text-sm">
                Total Votes: {totalVotes} | Voters: {voterRecords.length}
              </span>
              <button
                onClick={fetchData}
                className="bg-white text-green-800 px-3 py-1 rounded text-sm font-medium hover:bg-green-100"
              >
                <FaRedo className="inline mr-1" /> Refresh
              </button>
              <div className="flex space-x-4">
                <a
                  href="/voteadmin-page"
                  className=" text-white px-4 py-2 rounded-md"
                  style={{ backgroundColor: "#003f5a" }}
                >
                  See L.votes
                </a>
                <a
                  href="/Admin-delegates"
                  className=" text-white px-4 py-2 rounded-md"
                  style={{ backgroundColor: "#003f5a" }}
                >
                  Delegate Management
                </a>

                <a
                  href="/registration-page"
                  className=" text-white px-4 py-2 rounded-md"
                  style={{ backgroundColor: "#003f5a" }}
                >
                  Leader Management
                </a>
              </div>
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
            <h3 className="text-lg font-semibold text-white">Voter Records</h3>
            <p className="text-gray-300 text-sm">
              Total Voters: {voterRecords.length}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registration Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    School/Faculty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vote Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {voterRecords.map((voter, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {voter.full_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {voter.registration_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {voter.faculty || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(voter.vote_time).toLocaleString()}
                    </td>
                  </tr>
                ))}
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
              <p className="text-sm text-gray-500">Total Votes Cast</p>
              <p className="text-2xl font-bold">{totalVotes}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VotesAdmin2;
