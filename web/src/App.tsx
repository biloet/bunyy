import { Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import Create from "./pages/Create";
import TokenPage from "./pages/TokenPage";
import Positions from "./pages/Positions";
import Transactions from "./pages/Transactions";
import Rules from "./pages/Rules";
import { isConfigured, missingEnv } from "./config";

export default function App() {
  return (
    <>
      <Header />
      <main className="container">
        {!isConfigured && (
          <div className="notice">
            The app is not configured yet. Missing:{" "}
            {missingEnv.map((k, i) => (
              <span key={k}>
                {i > 0 && ", "}
                <code>{k}</code>
              </span>
            ))}
            . Set them as environment variables on your host (e.g. Vercel → Settings → Environment Variables) or in{" "}
            <code>web/.env</code>, then rebuild/redeploy.
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
