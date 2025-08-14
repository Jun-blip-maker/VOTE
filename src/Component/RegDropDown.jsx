import React, { useState } from "react";

const RegDropDown = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div
      className="relative inline-block text-left"
      style={{ marginLeft: "auto", marginRight: "20px" }}
    >
      <button
        onClick={toggleDropdown}
        className="bg-green-700 hover:bg-green-800 text-white text-sm sm:text-base py-2 px-4 rounded mr-4 transition-colors duration-300"
        style={{ display: "flex", alignItems: "center" }}
      >
        Register
        <svg
          className={`ml-2 w-4 h-4 transition-transform ${
            isOpen ? "transform rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <a
              href="/delegate-reg"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              role="menuitem"
            >
              Register as a Delegate
            </a>
            <a
              href="/leader-reg"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              role="menuitem"
            >
              Register as a Leaders
            </a>
            <a
              href="/student-reg"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              role="menuitem"
            >
              register as a Student
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegDropDown;
