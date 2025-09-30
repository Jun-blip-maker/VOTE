import "./vote.css";
import VoteDropdown from "./VoteDropdown";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import RegDropDown from "./RegDropDown";

function Leaders() {
  const [candidatesByPosition, setCandidatesByPosition] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          "http://localhost:5000/api/leaders/approved"
        );

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log("API Response:", data); // Debug log

        // Group candidates by position
        const grouped = data.candidates.reduce((acc, candidate) => {
          const normalizedPosition = candidate.position.trim();

          if (!acc[normalizedPosition]) {
            acc[normalizedPosition] = [];
          }
          acc[normalizedPosition].push(candidate);
          return acc;
        }, {});

        setCandidatesByPosition(grouped);
        console.log("Grouped candidates:", grouped); // Debug log
        setError(null);
      } catch (error) {
        console.error("Error fetching candidates:", error);
        setError("Failed to load candidates. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCandidates();
  }, []);

  // Get photo URL for a candidate - optimized for backend compatibility
  const getPhotoUrl = (candidate) => {
    // Priority 1: Use photoUrl from backend if provided and valid
    if (
      candidate.photoUrl &&
      candidate.photoUrl !== "/api/leaders/photo/null"
    ) {
      return `http://localhost:5000${candidate.photoUrl}`;
    }

    // Priority 2: Try to construct URL using original_leader_id if available
    if (candidate.original_leader_id) {
      return `http://localhost:5000/api/leaders/photo/${candidate.original_leader_id}`;
    }

    // Priority 3: Fallback to using the current ID (might not work but worth trying)
    if (candidate.id) {
      return `http://localhost:5000/api/leaders/photo/${candidate.id}`;
    }

    return null;
  };

  // Get all available positions from the data and sort them
  const getOrderedPositions = () => {
    const availablePositions = Object.keys(candidatesByPosition);

    // Define preferred order - positions will appear in this order if they exist
    const preferredOrder = [
      "ChairPerson",
      "Vice ChairPerson",
      "Secretary General",
      "Finance Secretary",
      "Academic Director",
      "Sports and Entertainment Director",
      "Welfare Director",
    ];

    // Function to check if two position names match (case-insensitive, flexible spacing)
    const positionsMatch = (pos1, pos2) => {
      const normalize = (str) => str.replace(/\s+/g, "").toLowerCase();
      return (
        normalize(pos1) === normalize(pos2) ||
        pos1.toLowerCase() === pos2.toLowerCase()
      );
    };

    // Sort positions: first by preferred order, then alphabetically for any extras
    return availablePositions.sort((a, b) => {
      const aIndex = preferredOrder.findIndex((pos) => positionsMatch(pos, a));
      const bIndex = preferredOrder.findIndex((pos) => positionsMatch(pos, b));

      // Both positions are in preferred order
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;

      // Only 'a' is in preferred order
      if (aIndex !== -1) return -1;

      // Only 'b' is in preferred order
      if (bIndex !== -1) return 1;

      // Neither is in preferred order, sort alphabetically
      return a.localeCompare(b);
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading candidates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Error Loading Candidates
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const orderedPositions = getOrderedPositions();

  return (
    <>
      <header className="header sticky top-0 z-50  font-sans font-semibold">
        <div
          className="flex  text-white font-sans font-semibold h-10 py-1 justify-between"
          style={{ backgroundColor: "#008800" }}
        >
          <ul className="space-x-5 flex">
            <li className="info-item ml-8">
              <a
                href="tel:+254796346686"
                className="info-link"
                aria-label="Call us at (+254) 796346686"
              >
                <i className="info-icon fas fa-phone"></i>
                <span className="info-text">(+254) 796346696</span>
              </a>
            </li>
            <li className="info-item">
              <a
                href="mailto:info@gau.ac.ke"
                className="info-link"
                aria-label="Email us at info@gau.ac.ke"
              >
                <i className="info-icon far fa-envelope"></i>
                <span className="info-text">info@gau.ac.ke</span>
              </a>
            </li>
          </ul>
        </div>
        <nav
          className="shadow-md "
          style={{
            position: "relative",
            height: "70px",
            width: "100%",
            backgroundColor: "#fff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div className="flex  font-sans font-semibold h-16 py-1 justify-between">
            <ul>
              <li>
                <a href="https://gau.ac.ke/">
                  <img
                    className="h-10 ml-8"
                    src="/src/Component/images/g-logo.png"
                    alt="GAU"
                  />
                </a>
              </li>
            </ul>
          </div>
          <div className="flex items-center mr-8">
            <RegDropDown />
            <Link
              to="/"
              className="bg-green-700 hover:bg-green-800 text-white text-sm sm:text-base py-2 px-2 rounded mr-2 transition-colors duration-300"
            >
              logout
            </Link>
          </div>
        </nav>
      </header>

      {/* Candidates Display Section */}
      <div className="">
        <div className="container mx-auto px-8 py-2 ">
          <h1 className="head font-bold font-sans text-black  text-5xl">
            CANDIDATES
          </h1>

          {/* Check if there are any candidates */}
          {Object.keys(candidatesByPosition).length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-5xl mb-4">👥</div>
              <h2 className="text-xl font-bold text-gray-600 mb-2">
                No Candidates Yet
              </h2>
              <p className="text-gray-500">
                No leaders have been approved yet. Please check back later.
              </p>
            </div>
          ) : (
            /* Display all available positions in preferred order */
            orderedPositions.map((position) => (
              <div key={position} className="mb-12">
                <h2
                  className="text-2xl font-bold mb-6 pb-2 border-b"
                  style={{ color: "black", borderColor: "#008800" }}
                >
                  {position.replace(/([A-Z])/g, " $1").trim()}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {candidatesByPosition[position].map((candidate) => {
                    const photoUrl = getPhotoUrl(candidate);
                    console.log(`Candidate ${candidate.fullName}:`, {
                      photoUrl,
                      candidateId: candidate.id,
                      originalLeaderId: candidate.original_leader_id,
                      backendPhotoUrl: candidate.photoUrl,
                    }); // Detailed debug info

                    return (
                      <div
                        key={candidate.id}
                        className="relative bg-white rounded-lg shadow-md overflow-hidden group"
                        style={{ height: "300px" }}
                      >
                        {/* Main content (always visible) */}
                        <div className="p-6 h-full flex flex-col items-center justify-center">
                          {/* Candidate Photo */}
                          <div className="flex justify-center mb-4 relative">
                            {photoUrl ? (
                              <>
                                <img
                                  src={photoUrl}
                                  alt={candidate.fullName}
                                  className="w-32 h-32 rounded-full object-cover border-4 photo-img"
                                  style={{ borderColor: "#008800" }}
                                  onError={(e) => {
                                    console.log(
                                      `Image failed to load: ${photoUrl}`
                                    );
                                    e.target.style.display = "none";
                                    const fallback =
                                      e.target.parentElement.querySelector(
                                        ".photo-fallback"
                                      );
                                    if (fallback) {
                                      fallback.style.display = "flex";
                                      fallback.classList.remove("hidden");
                                    }
                                  }}
                                  onLoad={(e) => {
                                    console.log(
                                      `Image loaded successfully: ${photoUrl}`
                                    );
                                    const fallback =
                                      e.target.parentElement.querySelector(
                                        ".photo-fallback"
                                      );
                                    if (fallback) {
                                      fallback.style.display = "none";
                                    }
                                  }}
                                />
                                {/* Loading indicator */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                                </div>
                              </>
                            ) : null}

                            {/* Fallback avatar - shows when no photo or photo fails to load */}
                            <div
                              className={`photo-fallback w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 ${
                                photoUrl ? "hidden" : "flex"
                              }`}
                              style={{ borderColor: "#008800" }}
                            >
                              <span className="text-gray-500 text-4xl">
                                {candidate.fullName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>

                          {/* Candidate Name */}
                          <h3 className="text-xl font-bold text-center">
                            {candidate.fullName}
                          </h3>

                          {/* Registration Number */}
                          <p className="text-sm text-gray-600 mt-1">
                            {candidate.regNumber}
                          </p>

                          {/* School */}
                          <p className="text-sm text-gray-500 mt-1">
                            {candidate.school}
                          </p>
                        </div>

                        {/* Overlay with additional info (shown on hover) */}
                        <div className="absolute inset-0 bg-white bg-opacity-95 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-6 text-center">
                          <h3 className="text-xl font-bold mb-2">
                            {candidate.fullName}
                          </h3>
                          <div className="space-y-1">
                            <p className="text-gray-600">
                              <span className="font-semibold">Position:</span>{" "}
                              {candidate.position}
                            </p>
                            <p className="text-gray-600">
                              <span className="font-semibold">Reg No:</span>{" "}
                              {candidate.regNumber}
                            </p>
                            <p className="text-gray-600">
                              <span className="font-semibold">School:</span>{" "}
                              {candidate.school}
                            </p>
                            {candidate.yearOfStudy && (
                              <p className="text-gray-600">
                                <span className="font-semibold">Year:</span>{" "}
                                {candidate.yearOfStudy}
                              </p>
                            )}
                            {candidate.phone && (
                              <p className="text-gray-600">
                                <span className="font-semibold">Phone:</span>{" "}
                                {candidate.phone}
                              </p>
                            )}
                            {candidate.email && (
                              <p className="text-gray-600">
                                <span className="font-semibold">Email:</span>{" "}
                                {candidate.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

export default Leaders;
