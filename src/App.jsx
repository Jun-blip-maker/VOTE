import "./App.css";
// import "bootstrap/dist/css/bootstrap.min.css";
import Home from "./Component/Home";
import Leaders from "./Component/Leaders";
import Login from "./Component/Login";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import VoteDropdown from "./Component/VoteDropdown";
import Delegates from "./Component/Delegates";
import Register from "./Component/Register";
import RegistrationAdmin from "./Component/RegistrationAdmin";
import VotesAdmin from "./Component/VotesAdmin";
import CVote from "./Component/CVote";

function App() {
  return (
    <Router>
      <Routes>
        <Route>
          <Route path="/" element={<Login />} />

          <Route path="/dropdown" element={<VoteDropdown />} />
          <Route path="/delegates-page" element={<Delegates />} />
          <Route path="/register-page" element={<Register />} />
          <Route path="/registration-page" element={<RegistrationAdmin />} />
          <Route path="/voteadmin-page" element={<VotesAdmin />} />
          <Route path="/CV-page" element={<CVote />} />
        </Route>

        <Route>
          <Route path="/home-page" element={<Home />} />
          <Route path="/leaders-page" element={<Leaders />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
