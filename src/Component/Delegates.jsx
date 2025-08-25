import React, { useState, useEffect } from "react";

const Delegates = () => {
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [voterData, setVoterData] = useState({
    fullName: "",
    registrationNumber: "",
  });
  const [candidates, setCandidates] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/candidates");

        if (!response.ok) {
          throw new Error(`Failed to load candidates: ${response.status}`);
        }

        const data = await response.json();
        setCandidates(data);
        setIsLoading(false);
      } catch (err) {
        setError("Failed to load candidates");
        setIsLoading(false);
      }
    };
    fetchCandidates();
  }, []);

  const handleCandidateSelect = (candidate) => {
    setSelectedCandidate(candidate);
    setError("");
  };

  const handleVoterChange = (e) => {
    const { name, value } = e.target;
    setVoterData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitVote = async (e) => {
    e.preventDefault();

    if (!selectedCandidate || !voterData.registrationNumber) {
      setError("Please select a candidate and enter your registration number");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          voterRegNumber: voterData.registrationNumber,
          candidateId: selectedCandidate.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit vote");
      }

      setSuccess(true);
      setError("");
      setVoterData({ fullName: "", registrationNumber: "" });
      setSelectedCandidate(null);

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || "Failed to submit vote");
    }
  };

  // Group candidates by faculty (changed from school to match our database)
  const candidatesByFaculty = candidates.reduce((acc, candidate) => {
    if (!acc[candidate.faculty]) acc[candidate.faculty] = [];
    acc[candidate.faculty].push(candidate);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl font-semibold">Loading candidates...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">
              {selectedCandidate
                ? "Confirm Your Vote"
                : "Student Delegates Election"}
            </h1>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700">
                <p>Thank you for voting! Your vote has been recorded.</p>
              </div>
            )}

            {!selectedCandidate ? (
              <div className="space-y-8">
                {Object.entries(candidatesByFaculty).map(
                  ([faculty, facultyCandidates]) => (
                    <div
                      key={faculty}
                      className="border-b border-gray-200 pb-6 last:border-b-0"
                    >
                      <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        {faculty}
                      </h2>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {facultyCandidates.map((candidate) => (
                          <div
                            key={candidate.id}
                            className="p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 cursor-pointer transition-colors"
                            onClick={() => handleCandidateSelect(candidate)}
                          >
                            <h3 className="font-medium text-gray-900">
                              {candidate.full_name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {candidate.registration_number}
                            </p>
                            {candidate.position && (
                              <p className="text-sm text-gray-600 mt-1">
                                Position: {candidate.position}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmitVote} className="space-y-6">
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-indigo-800">
                    Selected Candidate
                  </h3>
                  <div className="mt-2">
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedCandidate.full_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedCandidate.faculty}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Reg: {selectedCandidate.registration_number}
                    </p>
                    {selectedCandidate.position && (
                      <p className="text-sm text-gray-600 mt-1">
                        Position: {selectedCandidate.position}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    id="fullName"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={voterData.fullName}
                    onChange={handleVoterChange}
                  />
                </div>

                <div>
                  <label
                    htmlFor="registrationNumber"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Your Registration Number
                  </label>
                  <input
                    type="text"
                    name="registrationNumber"
                    id="registrationNumber"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={voterData.registrationNumber}
                    onChange={handleVoterChange}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedCandidate(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Submit Vote
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Delegates;
