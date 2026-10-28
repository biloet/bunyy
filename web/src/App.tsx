import { Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import Create from "./pages/Create";
import TokenPage from "./pages/TokenPage";
import Positions from "./pages/Positions";
import Transactions from "./pages/Transactions";
import Rules from "./pages/Rules";
import { isConfigured } from "./config";

export default function App() {
  return (
    <>
      <Header />
      <main className="container">
        {!isConfigured && (
          <div className="notice">
            The app is not configured yet. Copy <code>web/.env.example</code> to <code>web/.env</code> and set{" "}
            <code>VITE_RPC_URL</code> and <code>VITE_LAUNCHPAD_ADDRESS</code>.
          </div>
        )}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<Create />} />
          <Route path="/token/:address" element={<TokenPage />} />
          <Route path="/positions" element={<Positions />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/rules" element={<Rules />} />
        </Routes>
      </main>
    </>
  );
}
