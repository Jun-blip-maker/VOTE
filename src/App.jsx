import "./App.css";
import Home from "./Component/Home";
import Leaders from "./Component/Leaders";
import Login from "./Component/Login";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import VoteDropdown from "./Component/VoteDropdown";
import Delegates from "./Component/Delegates";
import RegistrationAdmin from "./Component/RegistrationAdmin";
import VotesAdmin from "./Component/VotesAdmin";
import CVote from "./Component/CVote";
import Student from "./Component/Student";
import StudentSignin from "./Component/StudentSignin";
import DelegateReg from "./Component/DelegateReg";
import DelegateSignin from "./Component/DelegateSignin";
import LeaderReg from "./Component/LeaderReg";
import RegDropDown from "./Component/RegDropDown";
import AdminDelegates from "./Component/AdminDelegates";
import LeaderSignin from "./Component/LeaderSignin";
import VotesAdmin2 from "./Component/VotesAdmin2";
import ProtectedRoute from "./Component/ProtectedRoute";
import Delegatecopy from "./Component/Delegatecopy";
function App() {
  return (
    <Router>
      <Routes>
        {/* Only Login is public */}
        <Route path="/login" element={<Login />} />

        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* All other routes are protected */}
        <Route
          path="/home-page"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaders-page"
          element={
            <ProtectedRoute>
              <Leaders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dropdown"
          element={
            <ProtectedRoute>
              <VoteDropdown />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delegates-page"
          element={
            <ProtectedRoute>
              <Delegates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delegatecopy-page"
          element={
            <ProtectedRoute>
              <Delegatecopy />
            </ProtectedRoute>
          }
        />
        <Route
          path="/CV-page"
          element={
            <ProtectedRoute>
              <CVote />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student-reg"
          element={
            <ProtectedRoute>
              <Student />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student-signin"
          element={
            <ProtectedRoute>
              <StudentSignin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delegate-reg"
          element={
            <ProtectedRoute>
              <DelegateReg />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delegate-signin"
          element={
            <ProtectedRoute>
              <DelegateSignin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leader-reg"
          element={
            <ProtectedRoute>
              <LeaderReg />
            </ProtectedRoute>
          }
        />
        <Route
          path="/regdropdown"
          element={
            <ProtectedRoute>
              <RegDropDown />
            </ProtectedRoute>
          }
        />
        <Route
          path="/registration-page"
          element={
            <ProtectedRoute>
              <RegistrationAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/voteadmin-page"
          element={
            <ProtectedRoute>
              <VotesAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Admin-delegates"
          element={
            <ProtectedRoute>
              <AdminDelegates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leadersignin"
          element={
            <ProtectedRoute>
              <LeaderSignin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/voteadmin2"
          element={
            <ProtectedRoute>
              <VotesAdmin2 />
            </ProtectedRoute>
          }
        />

        {/* Catch all route - redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
