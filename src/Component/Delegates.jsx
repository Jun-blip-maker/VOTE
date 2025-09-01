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

  // Define the schools exactly as they should appear
  const schools = [
    "School of Business and Economics",
    "School of Pure and Applied Science",
    "School of Education Art",
    "School of Education Science",
  ];

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        // FIXED: Use the correct endpoint that returns approved candidates
        const response = await fetch("http://localhost:5000/api/results");

        if (!response.ok) {
          throw new Error(`Failed to load candidates: ${response.status}`);
        }

        const data = await response.json();
        console.log("Candidates loaded:", data); // Debug log

        // ADDED: Debug each candidate's faculty
        data.forEach((candidate) => {
          console.log(
            `Candidate: ${candidate.full_name}, Faculty: "${candidate.faculty}"`
          );
        });

        setCandidates(data);
        setIsLoading(false);
      } catch (err) {
        setError("Failed to load candidates");
        setIsLoading(false);
        console.error("Error loading candidates:", err);
      }
    };
    fetchCandidates();
  }, []);

  // FIXED: Improved faculty matching logic
  const candidatesBySchool = schools.reduce((acc, school) => {
    acc[school] = candidates.filter((candidate) => {
      const candidateFaculty = (
        candidate.faculty ||
        candidate.school ||
        ""
      ).trim();

      // FIXED: Exact match first
      if (candidateFaculty === school) {
        console.log(`Exact match: ${candidate.full_name} -> ${school}`);
        return true;
      }

      // FIXED: More flexible partial matching
      const schoolLower = school.toLowerCase();
      const facultyLower = candidateFaculty.toLowerCase();

      // Check if faculty contains key words from school name
      const isMatch =
        facultyLower.includes(schoolLower) ||
        schoolLower.includes(facultyLower) ||
        // Additional specific matching for common abbreviations
        (schoolLower.includes("business") &&
          facultyLower.includes("business")) ||
        (schoolLower.includes("science") && facultyLower.includes("science")) ||
        (schoolLower.includes("education") &&
          facultyLower.includes("education")) ||
        (schoolLower.includes("art") && facultyLower.includes("art"));

      if (isMatch) {
        console.log(
          `Match found: ${candidate.full_name} (${candidateFaculty}) -> ${school}`
        );
      }

      return isMatch;
    });

    // Debug: Log how many candidates found for each school
    console.log(`${school}: ${acc[school].length} candidates`);

    return acc;
  }, {});

  const handleCandidateSelect = (e) => {
    const candidateId = e.target.value;
    if (candidateId === "") {
      setSelectedCandidate(null);
      return;
    }

    const candidate = candidates.find((c) => c.id.toString() === candidateId);
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl font-semibold">Loading candidates...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">
              {selectedCandidate
                ? "Confirm Your Vote"
                : "School Delegates Election"}
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
                {schools.map((school) => (
                  <div
                    key={school}
                    className="border-b border-gray-200 pb-6 last:border-b-0"
                  >
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">
                      {school}
                    </h2>

                    {candidatesBySchool[school] &&
                    candidatesBySchool[school].length > 0 ? (
                      <select
                        className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-50 focus:border-green-50"
                        onChange={handleCandidateSelect}
                        defaultValue=""
                      >
                        <option value="">
                          Select a delegate from {school}
                        </option>
                        {candidatesBySchool[school].map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.full_name} -{" "}
                            {candidate.registration_number}
                            {candidate.position && ` (${candidate.position})`}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="bg-green-50 p-4 rounded-md">
                        <p className="text-green-700 italic">
                          No delegates available for this school.
                          <br />
                          <span className="text-sm">
                            (Admins need to approve delegates from this school)
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <form onSubmit={handleSubmitVote} className="space-y-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-green-800">
                    Selected Candidate
                  </h3>
                  <div className="mt-2">
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedCandidate.full_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedCandidate.faculty || selectedCandidate.school}
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-green focus:border-green-500 sm:text-sm"
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    value={voterData.registrationNumber}
                    onChange={handleVoterChange}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedCandidate(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring--500"
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
