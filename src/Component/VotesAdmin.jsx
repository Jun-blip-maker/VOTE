import React, { useState, useEffect } from "react";
import {
  FaVoteYea,
  FaRedo,
  FaUsers,
  FaChartLine,
  FaFlask,
  FaGraduationCap,
} from "react-icons/fa";

const API_CONFIG = {
  BASE_URL: "http://localhost:5000", // Changed from 3000 to 5000
  ENDPOINTS: {
    VOTES: "/api/votes/all",
    VOTE_COUNT: "/api/votes/count",
    VOTE_RESULTS: "/api/votes/results",
    LEADERS: "/api/leaders/approved",
  },
};

const VoteAdmin = () => {
  const [votes, setVotes] = useState([]);
  const [voteResults, setVoteResults] = useState({});
  const [totalVotes, setTotalVotes] = useState(0);
  const [approvedLeaders, setApprovedLeaders] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch data from server
  const fetchData = async () => {
    try {
      const [votesData, voteCountData, resultsData, leadersData] =
        await Promise.all([
          fetchVotes(),
          fetchVoteCount(),
          fetchVoteResults(),
          fetchApprovedLeaders(),
        ]);
      setVotes(votesData.votes || []);
      setTotalVotes(voteCountData.total_votes || 0);
      setVoteResults(resultsData);
      setApprovedLeaders(leadersData.candidates || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVotes = async () => {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VOTES}`
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  };

  const fetchVoteCount = async () => {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VOTE_COUNT}`
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  };

  const fetchVoteResults = async () => {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VOTE_RESULTS}`
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  };

  const fetchApprovedLeaders = async () => {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LEADERS}`
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  };

  const resetVotes = async () => {
    if (
      !window.confirm(
        "Are you sure you want to reset all votes? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/votes/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      await fetchData();
      alert("All votes have been reset successfully.");
    } catch (err) {
      setError(err.message);
    }
  };

  // Calculate school totals from votes
  const calculateSchoolTotals = () => {
    const schools = {};

    votes.forEach((vote) => {
      const school = vote.voter_school;
      if (school) {
        schools[school] = (schools[school] || 0) + 1;
      }
    });

    return schools;
  };

  // Auto-refresh data
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error)
    return <div className="text-red-500 text-center py-8">Error: {error}</div>;

  const schoolTotals = calculateSchoolTotals();

  return (
    <div className="bg-gray-100 min-h-screen">
      <nav
        className="text-white shadow-lg"
        style={{ backgroundColor: "#008800" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold">Voting Admin</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={resetVotes}
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition"
                style={{ backgroundColor: "#003f5a" }}
              >
                <FaRedo className="inline mr-1" /> Reset Votes
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-800 text-center mb-8">
          Voting Results Dashboard
        </h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500">Total Voters</p>
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
                  {schoolTotals["business"] || 0}
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
                  {schoolTotals["science"] || 0}
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
                  {(schoolTotals["education_arts"] || 0) +
                    (schoolTotals["education_science"] || 0)}
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
                {schoolTotals["business"] || 0} votes
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
                {schoolTotals["science"] || 0} votes
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
                {schoolTotals["education_arts"] || 0} votes
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
                {schoolTotals["education_science"] || 0} votes
              </p>
            </div>
          </div>
        </div>

        {/* Leadership Position Votes */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div className="bg-indigo-800 px-4 py-3">
            <h3 className="text-lg font-semibold text-white">
              Leadership Position Votes
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Votes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {voteResults.results_by_position &&
                  Object.entries(voteResults.results_by_position).map(
                    ([position, candidates]) => (
                      <React.Fragment key={position}>
                        {candidates.map((candidate, idx) => (
                          <tr key={`${position}-${idx}`}>
                            {idx === 0 && (
                              <td
                                rowSpan={candidates.length}
                                className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r"
                              >
                                {position.replace(/_/g, " ")}
                              </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {candidate.candidate_name} (
                              {candidate.candidate_reg_number})
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {candidate.votes}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    )
                  )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Voter Records */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div className="bg-gray-800 px-4 py-3">
            <h3 className="text-lg font-semibold text-white">Voter Records</h3>
          </div>
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
                    School
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {votes.map((vote) => (
                  <tr key={vote.id || vote.voter_reg_number}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {vote.voter_name || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {vote.voter_reg_number || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {vote.voter_school || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {vote.created_at
                        ? new Date(vote.created_at).toLocaleString()
                        : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Approved Leaders */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div className="bg-green-800 px-4 py-3">
            <h3 className="text-lg font-semibold text-white">
              Approved Leaders
            </h3>
          </div>
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
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    School
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {approvedLeaders.map((leader) => (
                  <tr key={leader.id || leader.regNumber}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {leader.fullName || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {leader.regNumber || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {leader.position || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {leader.school || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoteAdmin;
