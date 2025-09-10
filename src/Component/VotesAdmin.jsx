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
  BASE_URL: "http://localhost:5000",
  ENDPOINTS: {
    VOTE_COUNT: "/api/votes/count",
    VOTE_RESULTS: "/api/votes/results",
    LEADERS: "/api/leaders/approved",
    RESET: "/api/votes/reset",
  },
};

const VoteAdmin = () => {
  const [voteResults, setVoteResults] = useState({});
  const [totalVotes, setTotalVotes] = useState(0);
  const [approvedLeaders, setApprovedLeaders] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch data from server
  const fetchData = async () => {
    try {
      const [voteCountData, resultsData, leadersData] = await Promise.all([
        fetchVoteCount(),
        fetchVoteResults(),
        fetchApprovedLeaders(),
      ]);
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
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.RESET}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      await fetchData();
      alert("All votes have been reset successfully.");
    } catch (err) {
      setError(err.message);
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
    return <div className="text-red-500 text-center py-8">Error: {error}</div>;

  return (
    <div className="bg-gray-100 min-h-screen">
      <nav
        className="text-white shadow-lg"
        style={{ backgroundColor: "#008800" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold">Leadership Voting Admin</span>
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
          Leadership Voting Results
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
                <p className="text-gray-500">Leadership Votes</p>
                <h3 className="text-2xl font-bold">
                  {Object.values(voteResults.results_by_position || {}).reduce(
                    (total, candidates) =>
                      total +
                      candidates.reduce(
                        (sum, candidate) => sum + (candidate.votes || 0),
                        0
                      ),
                    0
                  )}
                </h3>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <FaVoteYea className="text-green-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500">Positions</p>
                <h3 className="text-2xl font-bold">
                  {Object.keys(voteResults.results_by_position || {}).length}
                </h3>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <FaChartLine className="text-purple-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500">Candidates</p>
                <h3 className="text-2xl font-bold">
                  {Object.values(voteResults.results_by_position || {}).reduce(
                    (total, candidates) => total + candidates.length,
                    0
                  )}
                </h3>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <FaGraduationCap className="text-yellow-600 text-xl" />
              </div>
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
