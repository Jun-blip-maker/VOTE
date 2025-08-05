import { useState } from "react";

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

  // State for submission status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

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
      // Replace this URL with your actual API endpoint
      const response = await fetch("http://localhost:3000/C.votes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      setSubmitMessage("Vote submitted successfully!");
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
      setSubmitMessage("Failed to submit vote. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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

                      {/* Position 1 */}
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
                          <option value="">Select candidate</option>
                          <option value="candidate1">Yahya Yasin</option>
                          <option value="candidate2">Yusra Majid</option>
                          <option value="candidate3">Ikram Matker</option>
                        </select>
                      </div>

                      {/* Position 2 */}
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
                          <option value="">Select candidate</option>
                          <option value="candidate1">Abdullah</option>
                          <option value="candidate2">Ali issack</option>
                          <option value="candidate3">Kaltuma Hassan</option>
                        </select>
                      </div>

                      {/* Position 3 */}
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
                          <option value="">Select candidate</option>
                          <option value="candidate1">Suleiman Yussuf</option>
                          <option value="candidate2">Mohammed Daud</option>
                          <option value="candidate3">Halima Ali</option>
                        </select>
                      </div>

                      {/* Position 4 */}
                      <div>
                        <label
                          htmlFor="treasurer"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Finance Director
                        </label>
                        <select
                          id="treasurer"
                          name="treasurer"
                          className="block w-full py-3 pl-3 pr-4 text-black transition-all duration-200 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-blue-600"
                          required
                          value={formData.treasurer}
                          onChange={handleChange}
                        >
                          <option value="">Select candidate</option>
                          <option value="candidate1">Khadijun Ali</option>
                          <option value="candidate2">Dahabo Dima </option>
                          <option value="candidate3">Dima Ali</option>
                        </select>
                      </div>

                      {/* Position 5 */}
                      <div>
                        <label
                          htmlFor="academic"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Academic Directror
                        </label>
                        <select
                          id="academic"
                          name="academic"
                          className="block w-full py-3 pl-3 pr-4 text-black transition-all duration-200 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-blue-600"
                          required
                          value={formData.academic}
                          onChange={handleChange}
                        >
                          <option value="">Select candidate</option>
                          <option value="candidate1">Said Abdallah</option>
                          <option value="candidate2">Kassim Ali</option>
                          <option value="candidate3">Hashim Abdullah</option>
                        </select>
                      </div>

                      {/* Position 6 */}
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
                          <option value="">Select candidate</option>
                          <option value="candidate1">Aisha Daud</option>
                          <option value="candidate2">Abdikareem Ali</option>
                          <option value="candidate3">Salih Hussein</option>
                        </select>
                      </div>

                      {/* Position 7 */}
                      <div>
                        <label
                          htmlFor="sports"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Sports and Entertainment Director
                        </label>
                        <select
                          id="sports"
                          name="sports"
                          className="block w-full py-3 pl-3 pr-4 text-black transition-all duration-200 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-blue-600"
                          required
                          value={formData.sports}
                          onChange={handleChange}
                        >
                          <option value="">Select candidate</option>
                          <option value="candidate1">Najma Feisal</option>
                          <option value="candidate2">Arafat Adan</option>
                          <option value="candidate3">Sudeys Abdimalik</option>
                        </select>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`inline-flex items-center justify-center w-full px-4 py-4 text-base font-semibold text-white transition-all duration-200 border border-transparent rounded-md focus:outline-none ${
                          isSubmitting
                            ? "bg-green-400"
                            : "bg-green-600 hover:bg-green-700 focus:bg-green-700"
                        }`}
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
