import React, { useState } from "react";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

function LeaderReg() {
  const [formData, setFormData] = useState({
    fullName: "",
    regNumber: "",
    school: "",
    position: "",
    phone: "",
    email: "",
    yearOfStudy: "",
    // Removed course field
    photo: null,
    photoUrl: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { id, value, files } = e.target;

    if (id === "photo" && files && files[0]) {
      const photoUrl = URL.createObjectURL(files[0]);
      setFormData((prev) => ({
        ...prev,
        photo: files[0],
        photoUrl: photoUrl,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [id]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validation - match backend requirements
      if (
        !formData.fullName ||
        !formData.regNumber ||
        !formData.phone ||
        !formData.position // Changed from photo to position
      ) {
        throw new Error("Required fields are missing!");
      }

      // Prepare JSON data (not FormData)
      const submissionData = {
        fullName: formData.fullName.trim(),
        regNumber: formData.regNumber.trim(),
        school: formData.school.trim(),
        position: formData.position.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        yearOfStudy: formData.yearOfStudy.trim(),
        // Removed course field
        // Photo upload would need separate handling
      };

      // Send to server using the correct leader endpoint
      const response = await fetch(
        "http://localhost:5000/api/leaders/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json", // Added JSON header
          },
          body: JSON.stringify(submissionData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      await Swal.fire({
        icon: "success",
        title: "Registration Successful!",
        html: `
          <div>
            <p>Your leader account has been created and is pending approval.</p>
            <p class="mt-2"><strong>Temporary Password:</strong> ${data.temp_password}</p>
            <p class="text-sm text-gray-600 mt-2">Use this password to login after your account is approved.</p>
          </div>
        `,
        showConfirmButton: true,
      });

      // Redirect to leader signin page
      navigate("/LeaderSignin");

      // Reset form
      setFormData({
        fullName: "",
        regNumber: "",
        school: "",
        position: "",
        phone: "",
        email: "",
        yearOfStudy: "",
        photo: null,
        photoUrl: "",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Registration Failed",
        text: error.message || "Registration failed. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center bg-green-50 py-12 px-4 md:px-10 lg:px-8">
      <div className="max-w-2xl mx-auto w-full">
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
          <div className="p-6 sm:p-8">
            <div className="text-center mb-6">
              <h2 className="mt-6 text-2xl font-extrabold text-gray-900">
                LEADER APPLICATION FORM
              </h2>
              <p className="text-gray-500">
                Fill in your details to register as a leader
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Personal Information */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  id="fullName"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registration Number *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  id="regNumber"
                  placeholder="Enter your registration number"
                  value={formData.regNumber}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  id="phone"
                  placeholder="07XXXXXXXX"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  id="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              {/* Academic Information */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  School
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  id="school"
                  value={formData.school}
                  onChange={handleChange}
                >
                  <option value="">Select School</option>
                  <option>School of Business and Economics</option>
                  <option>School of Pure and Applied Science</option>
                  <option>School of Education Arts</option>
                  <option>School of Education Science</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year of Study
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  id="yearOfStudy"
                  value={formData.yearOfStudy}
                  onChange={handleChange}
                >
                  <option value="">Select Year</option>
                  <option>1st Year</option>
                  <option>2nd Year</option>
                  <option>3rd Year</option>
                  <option>4th Year</option>
                </select>
              </div>

              {/* Position Applying For */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  id="position"
                  value={formData.position}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Position</option>
                  <option>ChairPerson</option>
                  <option>Vice ChairPerson</option>
                  <option>Secretary General</option>
                  <option>Finance Secretary</option>
                  <option>Academic Director</option>
                  <option>Sport/Entertainment Director</option>
                  <option>WellFair Director</option>
                </select>
              </div>

              {/* Photo Upload (Optional) */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Photo (Optional - Not implemented yet)
                </label>
                <input
                  type="file"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  id="photo"
                  accept=".jpg,.jpeg,.png"
                  onChange={handleChange}
                  disabled={true} // Disabled until implemented
                />
                {formData.photoUrl && (
                  <div className="mt-2">
                    <img
                      src={formData.photoUrl}
                      alt="Preview"
                      className="max-w-[100px] rounded-md"
                    />
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Photo upload feature is coming soon.
                </p>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                    isSubmitting ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 极 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Registering...
                    </>
                  ) : (
                    "Register as Leader"
                  )}
                </button>
              </div>
            </form>

            <div className="text-center text-sm text-gray-600">
              <p>
                Already registered?{" "}
                <a
                  href="/LeaderSignin"
                  className="font-medium text-green-600 hover:text-green-500"
                >
                  Sign in here
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeaderReg;
