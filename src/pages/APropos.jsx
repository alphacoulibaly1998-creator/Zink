function APropos({ onRetour }) {
  return (
    <div className="apropos-container">
      <div className="jeu-header">
        <button className="chat-retour" onClick={onRetour}>←</button>
        <h2 className="jeu-titre">ℹ️ À propos</h2>
      </div>

      <div className="apropos-logo">
        <h1 className="auth-titre">Zink</h1>
        <p className="apropos-slogan">Connecte-toi, joue, partage 💜</p>
      </div>

      <div className="apropos-infos">
        <div className="apropos-item">
          <span className="apropos-label">👤 Créateur</span>
          <span className="apropos-valeur">Alpha Coulibaly</span>
        </div>
        <div className="apropos-item">
          <span className="apropos-label">📧 Contact</span>
          <a href="mailto:zinkcontact8@gmail.com" className="apropos-valeur apropos-lien">
            zinkcontact8@gmail.com
          </a>
        </div>
        <div className="apropos-item">
          <span className="apropos-label">🔢 Version</span>
          <span className="apropos-valeur">1.0.0</span>
        </div>
      </div>

      <div className="apropos-description">
        <p>
          Zink est un réseau social pensé pour connecter, jouer et
          partager avec tes amis. Développé avec passion, une phase
          à la fois.
        </p>
      </div>

      <div className="apropos-footer">
        <p>© 2026 Zink. Tous droits réservés.</p>
      </div>
    </div>
  );
}

export default APropos;