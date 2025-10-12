import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const [formData, setFormData] = useState({
    registrationNumber: "",
    password: "",
    userType: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);
  const navigate = useNavigate();

  const features = [
    "Your Vote, Your Voice!",
    "Real-time Results",
    "Secure & Transparent",
    "Shape Campus Future",
    "Easy & Fast Voting",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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
    setError("");

    try {
      const response = await fetch("http://localhost:5000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        if (formData.userType === "admin") {
          navigate("/Admin-delegates");
        } else if (formData.userType === "student") {
          navigate("/home-page");
        }
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left side - Description */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-12 lg:bg-white">
        <div className="mx-auto max-w-lg space-y-8">
          {/* Main Title with Calligraphy Style */}
          <div className="text-center">
            <h1 className="text-5xl font-bold tracking-wide mb-6">
              <span className="bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">
                GAU
              </span>
              <br />
              <span className="text-4xl font-light italic text-green-800 mt-2 block">
                Voting System
              </span>
            </h1>
            <div className="h-16 overflow-hidden">
              <div
                className="transition-all duration-500 ease-in-out"
                style={{ transform: `translateY(-${currentFeature * 4}rem)` }}
              >
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="h-16 flex items-center justify-center"
                  >
                    <h2 className="text-2xl font-semibold text-green-700">
                      {feature}
                    </h2>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="text-center">
            <p className="text-green-700 font-medium">
              Join thousands of students making their voices heard
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-8 bg-white">
        <div className="mx-auto w-full max-w-md">
          <div className="bg-white rounded-xl p-8">
            {/* Mobile Logo and Title */}
            <div className="lg:hidden text-center mb-8">
              <div className="flex justify-center">
                <img
                  className="h-20"
                  src="/src/Component/images/gau-logo.png"
                  alt="GAU"
                />
              </div>
              <h1 className="mt-4 text-2xl font-bold">
                <span className="bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">
                  GAU
                </span>
                <span className="text-xl font-light italic text-green-800 block mt-1">
                  Voting System
                </span>
              </h1>
              <div className="mt-4 h-12 overflow-hidden">
                <div
                  className="transition-all duration-500 ease-in-out"
                  style={{ transform: `translateY(-${currentFeature * 3}rem)` }}
                >
                  {features.map((feature, index) => (
                    <div
                      key={index}
                      className="h-12 flex items-center justify-center"
                    >
                      <p className="text-base font-semibold text-green-700">
                        {feature}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Desktop Logo */}
            <div className="hidden lg:flex justify-center mb-6">
              <img
                className="h-16"
                src="/src/Component/images/gau-logo.png"
                alt="GAU"
              />
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
              <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900">
                LOGIN TO VOTE
              </h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-sm">
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <input
                    id="registrationNumber"
                    placeholder="Registration number"
                    name="registrationNumber"
                    type="text"
                    value={formData.registrationNumber}
                    onChange={handleChange}
                    required
                    autoComplete="text"
                    className="block w-full rounded-lg bg-white px-4 py-3 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all duration-200"
                  />
                </div>

                <div>
                  <input
                    id="password"
                    placeholder="Password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                    className="block w-full rounded-lg bg-white px-4 py-3 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all duration-200"
                  />
                </div>

                <div>
                  <select
                    id="user-type"
                    name="userType"
                    value={formData.userType}
                    onChange={handleChange}
                    className="block w-full rounded-lg bg-white px-4 py-3 text-base text-gray-900 border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all duration-200"
                    required
                  >
                    <option value="" disabled hidden>
                      Select user type
                    </option>
                    <option value="admin" className="text-gray-900">
                      Admin
                    </option>
                    <option value="student" className="text-gray-900">
                      Student
                    </option>
                  </select>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full justify-center rounded-lg bg-green-600 px-4 py-3 text-base font-semibold text-white shadow-xs hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200"
                  >
                    {loading ? "Logging in..." : "SIGN IN"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
