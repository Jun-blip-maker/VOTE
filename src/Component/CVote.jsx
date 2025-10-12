import React, { useState, useEffect } from "react";

function CVote() {
  // State for form data
  const [formData, setFormData] = useState({
    voter_name: "",
    voter_reg_number: "",
    voter_school: "",
    chairperson: "",
    vice_chair: "",
    secretary: "",
    treasurer: "",
    academic: "",
    welfare: "",
    sports: "",
  });

  // State for candidates by position - will be populated dynamically
  const [candidates, setCandidates] = useState({});
  const [availablePositions, setAvailablePositions] = useState([]);

  // State for submission status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [debugInfo, setDebugInfo] = useState(""); // For debugging

  // UPDATED POSITION MAPPING - Fixed sports mapping
  const positionMap = {
    chairperson: "ChairPerson",
    vice_chair: "Vice ChairPerson",
    secretary: "Secretary General",
    treasurer: "Finance Secretary",
    academic: "Academic Director",
    welfare: "WellFair Director",
    sports: "Sports and Entertainment Director", // FIXED: Match backend normalization
  };

  // Check if user has already voted
  useEffect(() => {
    const checkVoteStatus = async () => {
      const regNumber = localStorage.getItem("studentRegNumber");
      if (regNumber) {
        try {
          const response = await fetch(
            `http://localhost:5000/api/votes/check/${regNumber}`
          );
          if (response.ok) {
            const data = await response.json();
            setHasVoted(data.has_voted);
          }
        } catch (error) {
          console.error("Error checking vote status:", error);
        }
      }
    };

    checkVoteStatus();
  }, []);

  // Fetch ALL approved candidates and group them by position
  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        setIsLoading(true);
        console.log("🔄 Fetching candidates for all positions...");

        // Fetch all approved candidates at once
        const response = await fetch(
          "http://localhost:5000/api/leaders/approved"
        );

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log("📥 Fetched ALL candidates data:", data);

        // Group candidates by position
        const candidatesByPosition = {};
        const positions = [];

        data.candidates.forEach((candidate) => {
          console.log(
            `📋 Candidate: ${candidate.fullName} - Position: "${candidate.position}"`
          );

          if (!candidatesByPosition[candidate.position]) {
            candidatesByPosition[candidate.position] = [];
            positions.push(candidate.position);
          }
          candidatesByPosition[candidate.position].push(candidate);
        });

        console.log("🎯 Candidates grouped by position:", candidatesByPosition);
        console.log("📍 Available positions in DB:", positions);

        // DEBUG: Check specifically for sports positions
        const sportsPositions = positions.filter(
          (pos) =>
            pos.toLowerCase().includes("sport") ||
            pos.toLowerCase().includes("entertainment")
        );
        console.log("🏀 Sports-related positions found:", sportsPositions);

        setCandidates(candidatesByPosition);
        setAvailablePositions(positions);
      } catch (error) {
        console.error("❌ Error fetching candidates:", error);
        setSubmitMessage("Error loading candidates. Please refresh the page.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCandidates();
  }, []);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Show confirmation dialog
    const isConfirmed = window.confirm(
      "Are you sure you want to submit your vote? You won't be able to change it after submission."
    );

    if (!isConfirmed) {
      return; // Exit if user cancels
    }

    setIsSubmitting(true);
    setSubmitMessage("");
    setDebugInfo(""); // Reset debug info

    try {
      // Prepare the data to be sent in the format the backend expects
      const voteData = {
        voter_name: formData.voter_name,
        voter_reg_number: formData.voter_reg_number,
        voter_school: formData.voter_school,
        chairperson: formData.chairperson,
        vice_chair: formData.vice_chair,
        secretary: formData.secretary,
        treasurer: formData.treasurer,
        academic: formData.academic,
        welfare: formData.welfare,
        sports: formData.sports,
      };

      console.log("🚀 Submitting vote data:", voteData);
      setDebugInfo(JSON.stringify(voteData, null, 2));

      const response = await fetch("http://localhost:5000/api/votes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(voteData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Server response:", data);

      setSubmitMessage("Vote submitted successfully!");
      setHasVoted(true);

      // Store registration number to prevent duplicate votes
      localStorage.setItem("studentRegNumber", formData.voter_reg_number);

      // Reset form after successful submission
      setFormData({
        voter_name: "",
        voter_reg_number: "",
        voter_school: "",
        chairperson: "",
        vice_chair: "",
        secretary: "",
        treasurer: "",
        academic: "",
        welfare: "",
        sports: "",
      });
    } catch (error) {
      console.error("❌ Error submitting vote:", error);

      if (error.message.includes("already voted")) {
        setHasVoted(true);
        localStorage.setItem("studentRegNumber", formData.voter_reg_number);
        setSubmitMessage(
          "You have already voted. Each student can only vote once."
        );
      } else {
        setSubmitMessage(`Failed to submit vote: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // IMPROVED: Find the matching position in the database with better sports handling
  const findMatchingPosition = (fieldName) => {
    const dbPositionName = positionMap[fieldName];

    if (!dbPositionName) {
      console.error(`❌ No position mapping found for field: ${fieldName}`);
      return null;
    }

    console.log(`🔍 Looking for position: "${dbPositionName}"`);

    // Check if this exact position exists in available positions
    let foundPosition = availablePositions.find(
      (pos) => pos === dbPositionName
    );

    // SPECIAL HANDLING FOR SPORTS POSITION
    if (!foundPosition && fieldName === "sports") {
      console.log(
        "🏀 Sports position not found exactly, searching for variations..."
      );

      // Look for any sports-related positions
      foundPosition = availablePositions.find((pos) => {
        const posLower = pos.toLowerCase();
        return posLower.includes("sport") || posLower.includes("entertainment");
      });

      if (foundPosition) {
        console.log(`🎯 Found sports variation: "${foundPosition}"`);
      }
    }

    if (!foundPosition) {
      console.warn(
        `⚠️ Position "${dbPositionName}" not found in available positions`
      );
      console.warn(`📋 Available positions:`, availablePositions);
      return null;
    }

    console.log(`✅ Position found: "${foundPosition}"`);
    return foundPosition;
  };

  // IMPROVED: Render candidate options for a position with sports debugging
  const renderCandidateOptions = (fieldName, displayName) => {
    if (isLoading) {
      return <option value="">Loading candidates...</option>;
    }

    // Find the matching position in the database
    const matchedPosition = findMatchingPosition(fieldName);

    if (!matchedPosition) {
      return (
        <option value="">No candidates available for {displayName}</option>
      );
    }

    const candidateList = candidates[matchedPosition] || [];

    // DEBUG LOGGING FOR SPORTS
    if (fieldName === "sports") {
      console.log(
        `🏀 Sports candidates for "${matchedPosition}":`,
        candidateList
      );
      console.log(
        `🏀 All sports-related positions:`,
        availablePositions.filter(
          (pos) =>
            pos.toLowerCase().includes("sport") ||
            pos.toLowerCase().includes("entertainment")
        )
      );
    }

    if (candidateList.length === 0) {
      return (
        <option value="">No candidates available for {displayName}</option>
      );
    }

    return [
      <option key="default" value="">
        Select candidate for {displayName}
      </option>,
      ...candidateList.map((candidate) => (
        <option key={candidate.id} value={candidate.regNumber}>
          {candidate.fullName} ({candidate.regNumber})
          {candidate.school && ` - ${candidate.school}`}
        </option>
      )),
    ];
  };

  if (hasVoted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-center">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              You've Already Voted
            </h2>
            <p className="text-gray-600 mb-6">
              Thank you for participating in the student elections. Each student
              can only vote once.
            </p>
            <button
              onClick={() => {
                localStorage.removeItem("studentRegNumber");
                window.location.reload();
              }}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors mr-2"
            >
              Clear Vote Record
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <section className="py-10 bg-gray-50 sm:py-16 lg:py-24">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold leading-tight text-black sm:text-4xl lg:text-5xl">
              Student Voting Portal
            </h2>
            <p className="max-w-xl mx-auto mt-4 text-base leading-relaxed text-gray-600">
              Cast your vote for student leadership positions
            </p>
          </div>

          <div className="relative max-w-md mx-auto mt-8 md:mt-16">
            <div className="overflow-hidden bg-white rounded-md shadow-md">
              <div className="px-4 py-6 sm:px-8 sm:py-7">
                {submitMessage && (
                  <div
                    className={`p-4 mb-6 rounded-md ${
                      submitMessage.includes("success") ||
                      submitMessage.includes("Thank you")
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {submitMessage}
                  </div>
                )}

                {/* Form Starts */}
                <form onSubmit={handleSubmit}>
                  <div className="space-y-5">
                    {/* Voter Information Fields (unchanged) */}
                    <div>
                      <label
                        htmlFor="voter_name"
                        className="text-base font-medium text-gray-900"
                      >
                        Full Name
                      </label>
                      <div className="mt-2.5 relative text-gray-400 focus-within:text-gray-600">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <svg
                            className="w-5 h-5"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>
                        <input
                          type="text"
                          id="voter_name"
                          name="voter_name"
                          placeholder="Enter your full name"
                          className="block w-full py-4 pl-10 pr-4 text-black placeholder-gray-500 transition-all duration-200 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-green-600 caret-green-600"
                          required
                          value={formData.voter_name}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="voter_reg_number"
                        className="text-base font-medium text-gray-900"
                      >
                        Registration Number
                      </label>
                      <div className="mt-2.5 relative text-gray-400 focus-within:text-gray-600">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <svg
                            className="w-5 h-5"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <input
                          type="text"
                          id="voter_reg_number"
                          name="voter_reg_number"
                          placeholder="Enter your registration number"
                          className="block w-full py-4 pl-10 pr-4 text-black placeholder-gray-500 transition-all duration-200 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-green-600 caret-green-600"
                          required
                          value={formData.voter_reg_number}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="voter_school"
                        className="text-base font-medium text-gray-900"
                      >
                        School/Delegate
                      </label>
                      <div className="mt-2.5 relative text-gray-400 focus-within:text-gray-600">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <svg
                            className="w-5 h-5"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                        </div>
                        <select
                          id="voter_school"
                          name="voter_school"
                          className="block w-full py-4 pl-10 pr-4 text-black placeholder-gray-500 transition-all duration-200 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-green-600 caret-green-600 appearance-none"
                          required
                          value={formData.voter_school}
                          onChange={handleChange}
                        >
                          <option value="">Select your school/delegate</option>
                          <option value="business">
                            School Of Business And Economics
                          </option>
                          <option value="science">
                            School Of Pure And Applied Science
                          </option>
                          <option value="education_arts">
                            School Of Education Arts
                          </option>
                          <option value="education_science">
                            School Of Education Science
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* Voting Positions */}
                    <div className="space-y-5">
                      <h3 className="text-lg font-medium text-gray-900">
                        Vote for Leadership Positions
                      </h3>

                      {/* Other positions... */}
                      <div>
                        <label
                          htmlFor="chairperson"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Chairperson
                        </label>
                        <select
                          id="chairperson"
                          name="chairperson"
                          className="block w-full py-3 pl-3 pr-4 text-black transition-all duration-200 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-green-600"
                          required
                          value={formData.chairperson}
                          onChange={handleChange}
                        >
                          {renderCandidateOptions("chairperson", "Chairperson")}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="vice_chair"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Vice Chairperson
                        </label>
                        <select
                          id="vice_chair"
                          name="vice_chair"
                          className="block w-full py-3 pl-3 pr-4 text-black transition-all duration-200 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-green-600"
                          required
                          value={formData.vice_chair}
                          onChange={handleChange}
                        >
                          {renderCandidateOptions(
                            "vice_chair",
                            "Vice Chairperson"
                          )}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="secretary"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Secretary General
                        </label>
                        <select
                          id="secretary"
                          name="secretary"
                          className="block w-full py-3 pl-3 pr-4 text-black transition-all duration-200 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-green-600"
                          required
                          value={formData.secretary}
                          onChange={handleChange}
                        >
                          {renderCandidateOptions(
                            "secretary",
                            "Secretary General"
                          )}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="treasurer"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Finance Secretary
                        </label>
                        <select
                          id="treasurer"
                          name="treasurer"
                          className="block w-full py-3 pl-3 pr-4 text-black transition-all duration-200 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-green-600"
                          required
                          value={formData.treasurer}
                          onChange={handleChange}
                        >
                          {renderCandidateOptions(
                            "treasurer",
                            "Finance Secretary"
                          )}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="academic"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Academic Director
                        </label>
                        <select
                          id="academic"
                          name="academic"
                          className="block w-full py-3 pl-3 pr-4 text-black transition-all duration-200 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-green-600"
                          required
                          value={formData.academic}
                          onChange={handleChange}
                        >
                          {renderCandidateOptions(
                            "academic",
                            "Academic Director"
                          )}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="welfare"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Welfare Director
                        </label>
                        <select
                          id="welfare"
                          name="welfare"
                          className="block w-full py-3 pl-3 pr-4 text-black transition-all duration-200 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-green-600"
                          required
                          value={formData.welfare}
                          onChange={handleChange}
                        >
                          {renderCandidateOptions(
                            "welfare",
                            "Welfare Director"
                          )}
                        </select>
                      </div>

                      {/* SPORTS POSITION - FIXED */}
                      <div>
                        <label
                          htmlFor="sports"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Sports & Entertainment Director
                        </label>
                        <select
                          id="sports"
                          name="sports"
                          className="block w-full py-3 pl-3 pr-4 text-black transition-all duration-200 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-blue-600"
                          required
                          value={formData.sports}
                          onChange={handleChange}
                        >
                          {renderCandidateOptions(
                            "sports",
                            "Sports & Entertainment Director"
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div>
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center w-full px-4 py-4 text-base font-semibold text-white transition-all duration-200 bg-green-600 border border-transparent rounded-md focus:outline-none hover:bg-green-700 focus:bg-green-700"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Submitting..." : "Submit Vote"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default CVote;
