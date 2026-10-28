import { Link } from "react-router-dom";
import ConnectButton from "./ConnectButton";
import { chain } from "../config";

export default function Header() {
  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="logo">
          🐰 bunyy<span className="logo-chain">{chain.name}</span>
        </Link>
        <nav className="nav">
          <Link to="/create" className="btn btn-primary">
            Launch a token
          </Link>
          <ConnectButton />
        </nav>
      </div>
    </header>
  );
}
