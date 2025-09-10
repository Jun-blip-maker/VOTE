import React, { useState, useEffect } from "react";

function CVote() {
  // State for form data
  const [formData, setFormData] = useState({
    name: "",
    regnumber: "",
    delegate: "",
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

  // Position mapping - maps form field names to database position names
  const positionMap = {
    chairperson: ["ChairPerson", "chairperson", "chair"],
    vice_chair: ["Vice ChairPerson", "vice chair", "vice chairperson", "vice"],
    secretary: ["Secretary General", "secretary", "secretary general"],
    treasurer: [
      "Finance Secretary",
      "treasurer",
      "finance secretary",
      "finance",
    ],
    academic: ["Academic Director", "academic", "academic director"],
    welfare: ["WellFair Director", "welfare", "welfare director", "wellfair"],
    sports: [
      "Sport/Entertainment Director",
      "sports",
      "sports director",
      "entertainment director",
    ],
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

        // Fetch all approved candidates at once
        const response = await fetch(
          "http://localhost:5000/api/leaders/approved"
        );

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log("Fetched candidates data:", data);

        // Group candidates by position
        const candidatesByPosition = {};
        const positions = [];

        data.candidates.forEach((candidate) => {
          if (!candidatesByPosition[candidate.position]) {
            candidatesByPosition[candidate.position] = [];
            positions.push(candidate.position);
          }
          candidatesByPosition[candidate.position].push(candidate);
        });

        console.log("Candidates grouped by position:", candidatesByPosition);
        console.log("Available positions in DB:", positions);

        setCandidates(candidatesByPosition);
        setAvailablePositions(positions);
      } catch (error) {
        console.error("Error fetching candidates:", error);
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

    try {
      const response = await fetch("http://localhost:5000/api/votes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Network response was not ok");
      }

      setSubmitMessage("Vote submitted successfully!");
      setHasVoted(true);

      // Store registration number to prevent duplicate votes
      localStorage.setItem("studentRegNumber", formData.regnumber);

      // Reset form after successful submission
      setFormData({
        name: "",
        regnumber: "",
        delegate: "",
        chairperson: "",
        vice_chair: "",
        secretary: "",
        treasurer: "",
        academic: "",
        welfare: "",
        sports: "",
      });
    } catch (error) {
      console.error("Error submitting vote:", error);
      setSubmitMessage(
        error.message || "Failed to submit vote. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Find the matching position in the database
  const findMatchingPosition = (fieldName) => {
    const possibleNames = positionMap[fieldName];

    if (!possibleNames) {
      console.error(`No position mapping found for field: ${fieldName}`);
      return null;
    }

    // Try to find a matching position in the database
    for (const pos of availablePositions) {
      const normalizedPos = pos.toLowerCase().replace(/\s+/g, "");

      for (const possibleName of possibleNames) {
        const normalizedPossible = possibleName
          .toLowerCase()
          .replace(/\s+/g, "");

        if (normalizedPos === normalizedPossible) {
          console.log(`Exact match: ${fieldName} to database position: ${pos}`);
          return pos;
        }
      }
    }

    // If no exact match, try partial matching
    for (const pos of availablePositions) {
      const normalizedPos = pos.toLowerCase().replace(/\s+/g, "");

      for (const possibleName of possibleNames) {
        const normalizedPossible = possibleName
          .toLowerCase()
          .replace(/\s+/g, "");

        if (
          normalizedPos.includes(normalizedPossible) ||
          normalizedPossible.includes(normalizedPos)
        ) {
          console.log(
            `Partial match: ${fieldName} to database position: ${pos}`
          );
          return pos;
        }
      }
    }

    console.warn(
      `No position found for ${fieldName} with possible names: ${possibleNames.join(
        ", "
      )}`
    );
    return null;
  };

  // Render candidate options for a position
  const renderCandidateOptions = (fieldName, displayName) => {
    if (isLoading) {
      return <option value="">Loading candidates...</option>;
    }

    // Find the matching position in the database
    const matchedPosition = findMatchingPosition(fieldName);

    if (!matchedPosition) {
      return <option value="">No candidates available</option>;
    }

    const candidateList = candidates[matchedPosition] || [];
    console.log(`Candidates for ${displayName}:`, candidateList);

    if (candidateList.length === 0) {
      return <option value="">No candidates available</option>;
    }

    return [
      <option key="default" value="">
        Select candidate for {displayName}
      </option>,
      ...candidateList.map((candidate) => (
        <option key={candidate.id} value={candidate.regNumber}>
          {candidate.fullName} ({candidate.regNumber})
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
              onClick={() => (window.location.href = "/")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
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
                      submitMessage.includes("success")
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
                    {/* Name Field */}
                    <div>
                      <label
                        htmlFor="name"
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
                          id="name"
                          name="name"
                          placeholder="Enter your full name"
                          className="block w-full py-4 pl-10 pr-4 text-black placeholder-gray-500 transition-all duration-200 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-blue-600 caret-blue-600"
                          required
                          value={formData.name}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    {/* Registration Number Field */}
                    <div>
                      <label
                        htmlFor="regnumber"
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
                          id="regnumber"
                          name="regnumber"
                          placeholder="Enter your registration number"
                          className="block w-full py-4 pl-10 pr-4 text-black placeholder-gray-500 transition-all duration-200 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-blue-600 caret-blue-600"
                          required
                          value={formData.regnumber}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    {/* School/Delegate Dropdown */}
                    <div>
                      <label
                        htmlFor="delegate"
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
                          id="delegate"
                          name="delegate"
                          className="block w-full py-4 pl-10 pr-4 text-black placeholder-gray-500 transition-all duration-200 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-blue-600 caret-blue-600 appearance-none"
                          required
                          value={formData.delegate}
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

                      {/* Chairperson */}
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
                          className="block w-full py-3 pl-3 pr-4 text-black transition-all duration-200 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-blue-600"
                          required
                          value={formData.chairperson}
                          onChange={handleChange}
                        >
                          {renderCandidateOptions("chairperson", "Chairperson")}
                        </select>
                      </div>

                      {/* Vice Chairperson */}
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
                          className="block w-full py-3 pl-3 pr-4 text-black transition-all duration-200 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-blue-600"
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

                      {/* Secretary General */}
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
                          className="block w-full py-3 pl-3 pr-4 text-black transition-all duration-200 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-blue-600"
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

                      {/* Finance Secretary */}
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
                          className="block w-full py-3 pl-3 pr-4 text-black transition-all duration-200 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-blue-600"
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

                      {/* Academic Director */}
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
                          className="block w-full py-3 pl-3 pr-4 text-black transition-all duration-200 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-blue-600"
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

                      {/* Welfare Director */}
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
                          className="block w-full py-3 pl-3 pr-4 text-black transition-all duration-200 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-blue-600"
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

                      {/* Sports and Entertainment Director */}
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
                        className="inline-flex items-center justify-center w-full px-4 py-4 text-base font-semibold text-white transition-all duration-200 bg-blue-600 border border-transparent rounded-md focus:outline-none hover:bg-blue-700 focus:bg-blue-700"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Submitting..." : "Submit Vote"}
                      </button>
                    </div>
                  </div>
                </form>
                {/* Form Ends */}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default CVote;
