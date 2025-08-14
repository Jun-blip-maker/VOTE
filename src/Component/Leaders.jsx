import "./vote.css";
import VoteDropdown from "./VoteDropdown";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import RegDropDown from "./RegDropDown";

function Leaders() {
  const [candidatesByPosition, setCandidatesByPosition] = useState({});

  useEffect(() => {
    fetch("http://localhost:3000/candidates")
      .then((response) => response.json())
      .then((data) => {
        const grouped = data.reduce((acc, candidate) => {
          if (!acc[candidate.position]) {
            acc[candidate.position] = [];
          }
          acc[candidate.position].push(candidate);
          return acc;
        }, {});
        setCandidatesByPosition(grouped);
      })
      .catch((error) => console.error("Error fetching candidates:", error));
  }, []);

  // Positions in order of importance
  const positions = [
    "ChairPerson",
    "Vice ChairPerson",
    "Secretary General",
    "Finance Secretary",
    "Academic Director",
    "Sport/Entertainment Director",
    "WellFair Director",
  ];

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
            <VoteDropdown />

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

          {/* Organized by Position */}
          {positions.map(
            (position) =>
              candidatesByPosition[position] && (
                <div key={position} className="mb-12">
                  <h2
                    className="text-2xl font-bold mb-6 pb-2 border-b"
                    style={{ color: "black", borderColor: "#008800" }}
                  >
                    {position.replace(/([A-Z])/g, " $1").trim()}
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {candidatesByPosition[position].map((candidate) => (
                      <div
                        key={candidate.id}
                        className="relative bg-white rounded-lg shadow-md overflow-hidden group"
                        style={{ height: "300px" }} // Fixed height for consistency
                      >
                        {/* Main content (always visible) */}
                        <div className="p-6 h-full flex flex-col items-center justify-center">
                          {/* Candidate Photo */}
                          <div className="flex justify-center mb-4">
                            {candidate.photoUrl ? (
                              <img
                                src={`/uploads/${candidate.photoUrl}`}
                                alt={candidate.fullName}
                                className="w-32 h-32 rounded-full object-cover border-4"
                                style={{ borderColor: "#008800" }}
                              />
                            ) : (
                              <div
                                className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4"
                                style={{ borderColor: "#008800" }}
                              >
                                <span className="text-gray-500 text-4xl">
                                  {candidate.fullName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Candidate Name */}
                          <h3 className="text-xl font-bold text-center">
                            {candidate.fullName}
                          </h3>
                        </div>

                        {/* Overlay with additional info (shown on hover) */}
                        <div className="absolute inset-0 bg-white bg-opacity-90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-6 text-center">
                          <h3 className="text-xl font-bold mb-2">
                            {candidate.fullName}
                          </h3>
                          <div className="space-y-1">
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
                    ))}
                  </div>
                </div>
              )
          )}
        </div>
      </div>
    </>
  );
}

export default Leaders;
