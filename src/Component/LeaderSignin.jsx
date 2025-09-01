import React, { useState } from "react";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

const LeaderSignin = () => {
  const [formData, setFormData] = useState({
    registrationNumber: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const API_URL = "http://localhost:5000";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/leaders/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registrationNumber: formData.registrationNumber,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "Wrong password") {
          throw new Error("Wrong password. Please try again.");
        } else if (data.error === "Leader not found") {
          throw new Error("Leader not found. Please register first.");
        } else if (
          data.error ===
          "Your account is pending admin approval. Please wait for approval."
        ) {
          throw new Error(
            "Your account is pending admin approval. Please wait for approval."
          );
        }
        throw new Error(data.error || "Login failed. Please try again.");
      }

      if (!data.leader.is_approved) {
        throw new Error(
          "Your account is pending admin approval. Please wait for approval before logging in."
        );
      }

      localStorage.setItem("leaderToken", data.token);
      localStorage.setItem("leaderData", JSON.stringify(data.leader));

      await Swal.fire({
        icon: "success",
        title: "Login Successful!",
        text: "Welcome back, leader!",
        showConfirmButton: false,
        timer: 1500,
      });

      navigate("/leaders-page");
    } catch (error) {
      setFormData((prev) => ({ ...prev, password: "" }));
      Swal.fire({
        icon: "error",
        title: "Login Failed",
        html: error.message.replace(/\n/g, "<br>"),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="mt-6 text-2xl font-extrabold text-gray-900">
            Leader Sign In
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to access leader features
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label
                htmlFor="registrationNumber"
                className="block text-sm font-medium text-gray-700"
              >
                Registration Number
              </label>
              <input
                id="registrationNumber"
                name="registrationNumber"
                type="text"
                required
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="Enter your registration number"
                value={formData.registrationNumber}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                loading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {loading ? (
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
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </div>
        </form>

        <div className="text-center text-sm text-gray-600">
          <p>
            Not registered yet?{" "}
            <a
              href="/leader-reg"
              className="font-medium text-green-600 hover:text-green-500"
            >
              Register as leader
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LeaderSignin;
