import { useNavigate, useLocation } from "react-router-dom";

const liens = [
  { path: "/", label: "Accueil", icon: "🏠" },
  { path: "/profil", label: "Profil", icon: "👤" },
  { path: "/amis", label: "Amis", icon: "👥" },
  { path: "/messages", label: "Messages", icon: "💬" },
  { path: "/jeux", label: "Jeux", icon: "🎮" },
  { path: "/decouvrir", label: "Découvrir", icon: "🔍" },
  { path: "/attaques", label: "Attaques", icon: "💥" },
];

function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="navbar">
      {liens.map((lien) => (
        <button
          key={lien.path}
          className={`nav-btn ${location.pathname === lien.path ? "actif" : ""}`}
          onClick={() => navigate(lien.path)}
        >
          <span className="nav-icon">{lien.icon}</span>
          <span className="nav-label">{lien.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default NavBar;