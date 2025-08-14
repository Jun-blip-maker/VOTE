import React, { useState } from "react";

function LeaderReg() {
  const [formData, setFormData] = useState({
    fullName: "",
    regNumber: "",
    school: "",
    position: "",
    phone: "",
    email: "",
    yearOfStudy: "",
    course: "",
    photo: null,
    photoUrl: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

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
      // Validation
      if (
        !formData.fullName ||
        !formData.regNumber ||
        !formData.phone ||
        !formData.photo
      ) {
        throw new Error("Required fields are missing!");
      }

      // Prepare data with all fields
      const submissionData = {
        fullName: formData.fullName.trim(),
        regNumber: formData.regNumber.trim(),
        school: formData.school.trim(),
        position: formData.position.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        yearOfStudy: formData.yearOfStudy.trim(),
        course: formData.course.trim(),
        photoUrl: formData.photo.name, // In real app, this would be server path
        createdAt: new Date().toISOString(),
      };

      // Send to server
      const response = await fetch("http://localhost:3000/candidates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) throw new Error("Submission failed");

      alert("Submitted successfully!");
      setFormData({
        fullName: "",
        regNumber: "",
        school: "",
        position: "",
        phone: "",
        email: "",
        yearOfStudy: "",
        course: "",
        photo: null,
        photoUrl: "",
      });
    } catch (error) {
      alert(error.message || "Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen    justify-center bg-green-50 py-12 px-4 md:px-10 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
          <div className="p-6 sm:p-8">
            <div className="text-center mb-6">
              <h2 className="mt-6 text-2xl font-extrabold text-gray-900">
                APPLICATION FORM
              </h2>
              <p className="text-gray-500">Fill in your details to register</p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Personal Information */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
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
                  Registration Number
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
                  Phone Number
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
                  placeholder="Select your school"
                  value={formData.school}
                  onChange={handleChange}
                  required
                >
                  <option value="disabled">Select School</option>
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
                  Position
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

              {/* Photo Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Photo
                </label>
                <input
                  type="file"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  id="photo"
                  accept=".jpg,.jpeg,.png"
                  onChange={handleChange}
                  required
                />
                {formData.photoUrl && (
                  <div className="mt-2">
                    <img
                      src={formData.photoUrl}
                      alt="Preview"
                      className="max-w-[100px]"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-green-700 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeaderReg;
