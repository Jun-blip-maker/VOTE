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
  BASE_URL: "http://localhost:3000",
  ENDPOINTS: {
    VOTES: "/votes",
    VOTERS: "/voters",
    LEADER_VOTES: "/C.votes",
  },
  DEFAULT_VOTES: {
    Khadijun: 0,
    Iqra: 0,
    Abdiaziz: 0,
    Abdimajid: 0,
    Atwa: 0,
    Zaki: 0,
    Leyla: 0,
    Sanem: 0,
    JeyJ: 0,
    Ali: 0,
    Yeshi: 0,
    zuuu: 0,
  },
};

// Candidate name mappings (NEW ADDITION)
const CANDIDATE_MAPPINGS = {
  chairperson: {
    candidate1: "Yahya Yasin",
    candidate2: "Yusra Majid",
    candidate3: "Ikram Matker",
  },
  vice_chair: {
    candidate1: "Abdullah",
    candidate2: "Ali issack",
    candidate3: "Kaltuma Hassan",
  },
  secretary: {
    candidate1: "Suleiman Yussuf",
    candidate2: "Mohammed Daud",
    candidate3: "Halima Ali",
  },
  treasurer: {
    candidate1: "Khadijun Ali",
    candidate2: "Dahabo Dima",
    candidate3: "Dima Ali",
  },
  academic: {
    candidate1: "Said Abdallah",
    candidate2: "Kassim Ali",
    candidate3: "Hashim Abdullah",
  },
  welfare: {
    candidate1: "Aisha Daud",
    candidate2: "Abdikareem Ali",
    candidate3: "Salih Hussein",
  },
  sports: {
    candidate1: "Najma Feisal",
    candidate2: "Arafat Adan",
    candidate3: "Sudeys Abdimalik",
  },
};

const VoteAdmin = () => {
  const [votes, setVotes] = useState(API_CONFIG.DEFAULT_VOTES);
  const [voters, setVoters] = useState([]);
  const [leaderVotes, setLeaderVotes] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch data from server
  const fetchData = async () => {
    try {
      const [votesData, votersData, leaderVotesData] = await Promise.all([
        fetchVotes(),
        fetchVoterRecords(),
        fetchLeaderVotes(),
      ]);
      setVotes(votesData);
      setVoters(votersData);
      setLeaderVotes(leaderVotesData);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  // ... [keep all other existing functions exactly the same until calculateLeaderVotes]

  // Modified calculateLeaderVotes function (ONLY CHANGE)

  const fetchVotes = async () => {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VOTES}`
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    validateVotesData(data);
    return data;
  };

  const fetchVoterRecords = async () => {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VOTERS}`
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    validateVoterRecords(data);
    return data;
  };

  const fetchLeaderVotes = async () => {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LEADER_VOTES}`
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  };

  const validateVotesData = (votes) => {
    if (!votes || typeof votes !== "object") {
      throw new Error("Invalid votes data structure");
    }
    Object.keys(API_CONFIG.DEFAULT_VOTES).forEach((candidate) => {
      if (votes[candidate] === undefined) {
        throw new Error(`Missing vote count for candidate: ${candidate}`);
      }
    });
  };

  const validateVoterRecords = (voters) => {
    if (!Array.isArray(voters)) {
      throw new Error("Voter records should be an array");
    }
    voters.forEach((voter) => {
      if (!voter.name || !voter.regNumber || !voter.votedFor) {
        throw new Error("Invalid voter record structure");
      }
    });
  };

  const businessTotal = votes.Khadijun + votes.Iqra + votes.Abdiaziz;
  const scienceTotal = votes.Abdimajid + votes.Atwa + votes.Zaki;
  const educationTotal =
    votes.Leyla +
    votes.Sanem +
    votes.JeyJ +
    votes.Ali +
    votes.Yeshi +
    votes.zuuu;
  // Calculate school totals
  const calculateLeaderVotes = () => {
    const positions = [
      "chairperson",
      "vice_chair",
      "secretary",
      "treasurer",
      "academic",
      "welfare",
      "sports",
    ];

    return positions.map((position) => {
      const votes = {};
      leaderVotes.forEach((vote) => {
        const candidateKey = vote[position];
        if (candidateKey) {
          const candidateName =
            CANDIDATE_MAPPINGS[position]?.[candidateKey] || candidateKey;
          votes[candidateName] = (votes[candidateName] || 0) + 1;
        }
      });

      return {
        position,
        candidates: Object.entries(votes).map(([name, count]) => ({
          name,
          count,
        })),
      };
    });
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
      await resetVoteCounts();
      await clearVoterRecords();
      await clearLeaderVotes();
      await fetchData();
      alert("All votes have been reset successfully.");
    } catch (err) {
      setError(err.message);
    }
  };

  const resetVoteCounts = async () => {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VOTES}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(API_CONFIG.DEFAULT_VOTES),
      }
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  };

  const clearVoterRecords = async () => {
    const votersData = await fetchVoterRecords();
    await Promise.all(
      votersData.map((voter) =>
        fetch(
          `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VOTERS}/${voter.id}`,
          {
            method: "DELETE",
          }
        )
      )
    );
  };

  const clearLeaderVotes = async () => {
    const leaderVotesData = await fetchLeaderVotes();
    await Promise.all(
      leaderVotesData.map((vote) =>
        fetch(
          `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LEADER_VOTES}/${vote.id}`,
          {
            method: "DELETE",
          }
        )
      )
    );
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
                <h3 className="text-2xl font-bold">{voters.length}</h3>
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
                <h3 className="text-2xl font-bold">{businessTotal}</h3>
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
                <h3 className="text-2xl font-bold">{scienceTotal}</h3>
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
                <h3 className="text-2xl font-bold">{educationTotal}</h3>
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
            <ul className="divide-y divide-gray-200">
              {[
                { name: "Khadijun", votes: votes.Khadijun, color: "blue" },
                { name: "Iqra", votes: votes.Iqra, color: "blue" },
                { name: "Abdiaziz", votes: votes.Abdiaziz, color: "blue" },
              ].map((candidate) => (
                <li
                  key={candidate.name}
                  className="px-4 py-3 flex justify-between items-center"
                >
                  <span>{candidate.name}</span>
                  <span
                    className={`bg-${candidate.color}-100 text-${candidate.color}-800 py-1 px-3 rounded-full text-sm font-medium`}
                  >
                    {candidate.votes}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pure & Applied Science */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-purple-600 px-4 py-3">
              <h3 className="text-lg font-semibold text-white">
                Pure & Applied Science
              </h3>
            </div>
            <ul className="divide-y divide-gray-200">
              {[
                { name: "Abdimajid", votes: votes.Abdimajid, color: "purple" },
                { name: "Atwa", votes: votes.Atwa, color: "purple" },
                { name: "Zaki", votes: votes.Zaki, color: "purple" },
              ].map((candidate) => (
                <li
                  key={candidate.name}
                  className="px-4 py-3 flex justify-between items-center"
                >
                  <span>{candidate.name}</span>
                  <span
                    className={`bg-${candidate.color}-100 text-${candidate.color}-800 py-1 px-3 rounded-full text-sm font-medium`}
                  >
                    {candidate.votes}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Education Arts */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-yellow-600 px-4 py-3">
              <h3 className="text-lg font-semibold text-white">
                Education Arts
              </h3>
            </div>
            <ul className="divide-y divide-gray-200">
              {[
                { name: "Leyla", votes: votes.Leyla, color: "yellow" },
                { name: "Sanem", votes: votes.Sanem, color: "yellow" },
                { name: "JeyJ", votes: votes.JeyJ, color: "yellow" },
              ].map((candidate) => (
                <li
                  key={candidate.name}
                  className="px-4 py-3 flex justify-between items-center"
                >
                  <span>{candidate.name}</span>
                  <span
                    className={`bg-${candidate.color}-100 text-${candidate.color}-800 py-1 px-3 rounded-full text-sm font-medium`}
                  >
                    {candidate.votes}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Education Science */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-red-600 px-4 py-3">
              <h3 className="text-lg font-semibold text-white">
                Education Science
              </h3>
            </div>
            <ul className="divide-y divide-gray-200">
              {[
                { name: "Ali", votes: votes.Ali, color: "red" },
                { name: "Yeshi", votes: votes.Yeshi, color: "red" },
                { name: "zuuu", votes: votes.zuuu, color: "red" },
              ].map((candidate) => (
                <li
                  key={candidate.name}
                  className="px-4 py-3 flex justify-between items-center"
                >
                  <span>{candidate.name}</span>
                  <span
                    className={`bg-${candidate.color}-100 text-${candidate.color}-800 py-1 px-3 rounded-full text-sm font-medium`}
                  >
                    {candidate.votes}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {/* Leadership Position Votes table remains the same */}
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
                {calculateLeaderVotes().map((positionData) => (
                  <React.Fragment key={positionData.position}>
                    {positionData.candidates.map((candidate, idx) => (
                      <tr key={`${positionData.position}-${idx}`}>
                        {idx === 0 && (
                          <td
                            rowSpan={positionData.candidates.length}
                            className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r"
                          >
                            {positionData.position.replace(/_/g, " ")}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {candidate.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {candidate.count}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Voted For
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {voters.map((voter) => (
                  <tr key={voter.id || voter.regNumber}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {voter.name || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {voter.regNumber || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {voter.email || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {voter.votedFor || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {voter.timestamp
                        ? new Date(voter.timestamp).toLocaleString()
                        : "N/A"}
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
