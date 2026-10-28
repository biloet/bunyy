import { Link, NavLink } from "react-router-dom";
import ConnectButton from "./ConnectButton";
import Logo from "./Logo";

const TABS = [
  { to: "/", label: "Home", end: true },
  { to: "/create", label: "Launch" },
  { to: "/positions", label: "My positions" },
  { to: "/transactions", label: "Transactions" },
  { to: "/rules", label: "Rules" },
];

export default function Header() {
  return (
    <header className="header">
      <div className="container header-top">
        <Link to="/" className="brand">
          <Logo size={34} />
          <span>bunyy</span>
        </Link>
        <ConnectButton />
      </div>
      <nav className="container tabs-nav" aria-label="Main">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? "nav-tab active" : "nav-tab")}>
            {t.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
