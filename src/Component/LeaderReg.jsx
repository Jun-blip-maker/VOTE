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
    photo: null,
    photoPreview: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          icon: "error",
          title: "File Too Large",
          text: "Please select an image smaller than 5MB.",
        });
        return;
      }

      // Validate file type
      const validTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!validTypes.includes(file.type)) {
        Swal.fire({
          icon: "error",
          title: "Invalid File Type",
          text: "Please select a valid image (JPG, JPEG, PNG).",
        });
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData((prev) => ({
          ...prev,
          photo: file,
          photoPreview: e.target.result,
        }));
      };
      reader.readAsDataURL(file);
    } else {
      setFormData((prev) => ({
        ...prev,
        photo: null,
        photoPreview: "",
      }));
    }
  };

  // Separate function to upload photo after registration
  const uploadPhoto = async (leaderId, photoFile) => {
    try {
      const photoData = new FormData();
      photoData.append("photo", photoFile);
      photoData.append("leader_id", leaderId.toString()); // Ensure it's string

      console.log("Uploading photo details:", {
        leaderId: leaderId,
        fileName: photoFile.name,
        fileSize: photoFile.size,
        fileType: photoFile.type,
      });

      const response = await fetch(
        "http://localhost:5000/api/leaders/upload-photo",
        {
          method: "POST",
          body: photoData,
        }
      );

      console.log("Upload response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Photo upload failed:", errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        return false;
      }

      const result = await response.json();
      console.log("Photo upload success:", result);
      return true;
    } catch (error) {
      console.error("Photo upload network error:", error);
      return false;
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
        !formData.position
      ) {
        throw new Error("Required fields are missing!");
      }

      // STEP 1: Register leader using JSON (matches your backend expectation)
      const submissionData = {
        fullName: formData.fullName.trim(),
        regNumber: formData.regNumber.trim(),
        school: formData.school.trim(),
        position: formData.position.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        yearOfStudy: formData.yearOfStudy.trim(),
      };

      console.log("Submitting registration data:", submissionData);

      const response = await fetch(
        "http://localhost:5000/api/leaders/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json", // Required for your backend
          },
          body: JSON.stringify(submissionData),
        }
      );

      const data = await response.json();
      console.log("Registration response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // STEP 2: Upload photo separately if exists
      let photoUploadSuccess = false;
      let photoUploadMessage = "";

      if (formData.photo && data.leader_id) {
        console.log("Attempting photo upload for leader:", data.leader_id);
        photoUploadSuccess = await uploadPhoto(data.leader_id, formData.photo);
        photoUploadMessage = photoUploadSuccess
          ? "✓ Photo uploaded successfully"
          : "⚠ Photo upload failed, but registration was successful";
      } else if (formData.photo && !data.leader_id) {
        console.warn("No leader_id received for photo upload");
        photoUploadMessage = "⚠ Could not upload photo - missing leader ID";
      }

      await Swal.fire({
        icon: "success",
        title: "Registration Successful!",
        html: `
          <div>
            <p>Your leader account has been created and is pending approval.</p>
            <p class="mt-2"><strong>Temporary Password:</strong> ${
              data.temp_password
            }</p>
            <p class="text-sm text-gray-600 mt-2">Use this password to login after your account is approved.</p>
            ${
              formData.photo
                ? `<p class="mt-2 ${
                    photoUploadSuccess ? "text-green-600" : "text-yellow-600"
                  }">
                ${photoUploadMessage}
              </p>`
                : ""
            }
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
        photoPreview: "",
      });

      // Reset file input
      const fileInput = document.getElementById("photo");
      if (fileInput) fileInput.value = "";
    } catch (error) {
      console.error("Registration error:", error);
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
                  <option>Sports and Entertainment Director</option>
                  <option>Welfare Director</option>
                </select>
              </div>

              {/* Photo Upload Section */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Photo (Optional)
                </label>
                <input
                  type="file"
                  id="photo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  accept=".jpg,.jpeg,.png"
                  onChange={handlePhotoChange}
                />

                {formData.photoPreview && (
                  <div className="mt-2">
                    <img
                      src={formData.photoPreview}
                      alt="Preview"
                      className="max-w-[100px] rounded-md"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Selected: {formData.photo?.name}
                    </p>
                  </div>
                )}

                <p className="text-sm text-gray-500 mt-1">
                  Supported formats: JPG, JPEG, PNG (Max 5MB)
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
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
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
