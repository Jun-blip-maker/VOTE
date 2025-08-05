import React, { useState, useEffect } from "react";
import "./vote.css";

function Delegates() {
  const [selectedOption, setSelectedOption] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    regNumber: "",
    email: "",
  });
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [voters, setVoters] = useState([]);
  const [votes, setVotes] = useState({
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
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("http://localhost:3000/voters");
        const data = await response.json();
        setVoters(data);

        const votesResponse = await fetch("http://localhost:3000/votes");
        const votesData = await votesResponse.json();
        setVotes(votesData);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    fetchData();
  }, []);

  const handleSchoolSelection = (e) => {
    const value = e.target.value;
    if (value) {
      setSelectedOption(value);
      setShowDetails(true);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const goBack = () => {
    setShowDetails(false);
    setSelectedOption("");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { fullName, regNumber, email } = formData;

    if (!fullName || !regNumber || !email || !selectedOption) {
      setError("All fields and a candidate must be selected.");
      return;
    }

    const hasVoted = voters.some((voter) => voter.regNumber === regNumber);
    if (hasVoted) {
      setError("This registration number has already voted.");
      return;
    }

    try {
      const newVoter = {
        id: Math.random().toString(36).substr(2, 9),
        name: fullName,
        regNumber,
        email,
        votedFor: selectedOption,
        timestamp: new Date().toISOString(),
      };

      const updatedVotes = { ...votes };
      updatedVotes[selectedOption] += 1;

      const voterResponse = await fetch("http://localhost:3000/voters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newVoter),
      });

      const votesResponse = await fetch("http://localhost:3000/votes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedVotes),
      });

      if (!voterResponse.ok || !votesResponse.ok) {
        throw new Error("Vote submission failed.");
      }

      setVoters([...voters, newVoter]);
      setVotes(updatedVotes);
      setError("");
      setSuccess(true);

      setFormData({ fullName: "", regNumber: "", email: "" });
      setSelectedOption("");
      setShowDetails(false);
    } catch (error) {
      console.error("Vote submission error:", error);
      setError("Failed to submit vote. Please try again.");
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-6">
      {!showDetails ? (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-3xl font-bold text-center text-green-800 mb-6">
              Select Your Delegate
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-2">
                  School of Business and Economics
                </label>
                <select
                  className="w-full p-2 border border-gray-300  rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  onChange={handleSchoolSelection}
                >
                  <option selected disabled>Choose a candidate</option>
                  <option >Khadijun</option>
                  <option >Iqra</option>
                  <option>Abdiaziz</option>
                </select>
              </div>
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-2">
                  School of Pure and Applied Science
                </label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  onChange={handleSchoolSelection}
                >
                  <option value="">Choose a candidate</option>
                  <option value="Abdimajid">Abdimajid</option>
                  <option value="Atwa">Atwa</option>
                  <option value="Zaki">Zaki</option>
                </select>
              </div>
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-2">
                  School of Education Arts
                </label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  onChange={handleSchoolSelection}
                >
                  <option value="">Choose a candidate</option>
                  <option value="Leyla">Leyla</option>
                  <option value="Sanem">Sanem</option>
                  <option value="JeyJ">JeyJ</option>
                </select>
              </div>
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-2">
                  School of Education Science
                </label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  onChange={handleSchoolSelection}
                >
                  <option value="">Choose a candidate</option>
                  <option value="Ali">Ali</option>
                  <option value="Yeshi">Yeshi</option>
                  <option value="Zuuu">Zuuu</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-3xl font-bold text-center text-green-800 mb-6">
              Voter Details
            </h2>
            {error && (
              <div className="bg-red-100 text-red-800 p-3 rounded mb-4">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-100 text-green-800 p-3 rounded mb-4">
                Thank You for Voting! Your Vote, Your Choice!
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Registration Number
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  name="regNumber"
                  value={formData.regNumber}
                  onChange={handleInputChange}
                  required
                />
                {voters.some((voter) => voter.regNumber === formData.regNumber) && (
                  <p className="text-red-600 text-sm mt-1">
                    This registration number has already voted.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="flex justify-between">
                <button
                  type="button"
                  className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                  onClick={goBack}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                  disabled={voters.some(
                    (voter) => voter.regNumber === formData.regNumber
                  )}
                >
                  Vote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Delegates;