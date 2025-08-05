import "./vote.css";
import React from "react";

function Home() {
  return (
    <div>
      <header className="header sticky top-0 z-50 font-sans font-semibold">  
        <div
          className="flex space-x-8 text-white font-sans font-semibold h-16 py-2 justify-between"
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
          style={{
            position: "relative",
            height: "100px",
            width: "100%",
            backgroundColor: "#fff",
          }}
        >
          <div className="flex space-x-8 font-sans font-semibold h-16 py-5  justify-between">
            <ul>
              <li>
                <a href="https://gau.ac.ke/">
                  <img
                    className="h-16 ml-8"
                    src="/src/Component/images/g-logo.png"
                    alt="GAU"
                  />
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </header>
      <div className="image">
        <div className="centered-text">GARISSA UNIVERSITY VOTING SYSYEM</div>
        <div className="centered-text2">"YOUR VOTE YOUR CHOICE"</div>
        <div className="centered-text3">Gauso voting system is a system that has made elections in the school
          much easier with less budget and convenient for all the students.
          <br />
          <a
            className="link-1"
            href="./leaders-page"
            aria-label="Know your leaders"
            style={{ color: "#008800" }}
          >
            KNOW YOUR LEADERS
          </a></div>
      </div>
      <div className="gau">
        <img
          className="mt-20 ml-60"
          src="/src/Component/images/gau-logo.png"
          alt="gauso"
          width="300px"
          height="300px"
        />
        <p className="font-sans font-semibold">
          Gauso voting system is a system that has made elections in the school
          much easier with less budget and convenient for all the students.
          <br />
          <a
            className="link-1"
            href="./leaders-page"
            aria-label="Know your leaders"
            style={{ color: "#008800" }}
          >
            KNOW YOUR LEADERS
          </a>
        </p>
        <p className="font-sans font-semibold">
          The system is designed to allow students to vote for their preferred
          leaders and delegates online, ensuring a transparent and efficient
          election process.
        </p>
        <p>
          {" "}
          <a
            className="link-1 font-semibold"
            href="/"
            aria-label="Know your leaders"
            style={{ color: "#008800" }}
          >
            LOGOUT
          </a>
        </p>
      </div>
    </div>
  );
}

export default Home;
