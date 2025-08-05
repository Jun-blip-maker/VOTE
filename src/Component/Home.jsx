import "./vote.css";
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

function Home() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const images = [
    "/src/Component/images/voting1.jpg",
    "/src/Component/images/voting2.jpg",
    "/src/Component/images/voting3.jpg",
    "/src/Component/images/voting4.jpg",
    "/src/Component/images/voting5.jpg"
  ];

  // Auto-scroll functionality
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPaused) {
        setActiveIndex(prev => (prev + 1) % images.length);
      }
    }, 3000); // Change slide every 3 seconds

    return () => clearInterval(interval);
  }, [images.length, isPaused]);

  const navigate = (direction) => {
    if (direction === 'next') {
      setActiveIndex(prev => (prev + 1) % images.length);
    } else {
      // For 'previous', we still move forward in the sequence
      setActiveIndex(prev => (prev - 1 + images.length) % images.length);
    }
    // Pause auto-scroll briefly after manual navigation
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 5000); // Resume after 5 seconds
  };

  return (
    <div>
      <header className="header sticky top-0 z-50  font-sans font-semibold">  
        <div
          className="flex space-x-8 text-white font-sans font-semibold h-10 py-1 px-20 justify-between"
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
                    <Link
  to="/leaders-page"
  className="bg-green-700 hover:bg-green-800 text-white text-sm sm:text-base py-2 px-2 rounded mr-2 transition-colors duration-300"
>
  Candidates
</Link>
                  <Link
  to="/"
  className="bg-green-700 hover:bg-green-800 text-white text-sm sm:text-base py-2 px-2 rounded mr-2 transition-colors duration-300"
>
  logout
</Link>  
                   
                  </div>
                </nav>
      </header>
      
      <div className="body">
        <div 
          className="relative w-full overflow-hidden"
          onMouseEnter={() => setIsPaused(true)} // Pause on hover
          onMouseLeave={() => setIsPaused(false)} // Resume when not hovering
        >
          <div 
            className="flex transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {images.map((img, index) => (
              <div key={index} className="w-full flex-shrink-0">
                <img 
                  src={img} 
                  className="w-full h-[500px] object-cover" 
                  alt={`Voting in progress ${index + 1}`} 
                />
              </div>
            ))}
          </div>

          {/* Navigation Arrows */}
          <button 
            onClick={() => navigate('prev')}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/30 text-white p-2 rounded-full hover:bg-black/50 transition-all"
            aria-label="Previous slide"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button 
            onClick={() => navigate('next')}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/30 text-white p-2 rounded-full hover:bg-black/50 transition-all"
            aria-label="Next slide"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Indicators */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setActiveIndex(index);
                  setIsPaused(true);
                  setTimeout(() => setIsPaused(false), 5000);
                }}
                className={`w-3 h-3 rounded-full ${index === activeIndex ? 'bg-white' : 'bg-white/50'} hover:bg-white/80 transition-colors`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;