import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import Marketplace from "./pages/Marketplace";
import CreateListing from "./pages/CreateListing";
import EditListing from "./pages/EditListing";
import MyListings from "./pages/MyListings";
import AdminPanel from "./pages/AdminPanel";

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/listings" element={<Marketplace />} />
          <Route path="/products" element={<Marketplace />} />
          <Route path="/listings/create" element={<CreateListing />} />
          <Route path="/products/create" element={<CreateListing />} />
          <Route path="/listings/edit/:id" element={<EditListing />} />
          <Route path="/products/edit/:id" element={<EditListing />} />
          <Route path="/my-listings" element={<MyListings />} />
          <Route path="/my-products" element={<MyListings />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
