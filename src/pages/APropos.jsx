import { useTranslation } from "react-i18next";

function APropos({ onRetour }) {
  const { t } = useTranslation();

  return (
    <div className="apropos-container">
      <div className="jeu-header">
        <button className="chat-retour" onClick={onRetour}>←</button>
        <h2 className="jeu-titre">{t("apropos.titre")}</h2>
      </div>

      <div className="apropos-logo">
        <h1 className="auth-titre">Zink</h1>
        <p className="apropos-slogan">{t("apropos.slogan")}</p>
      </div>

      <div className="apropos-infos">
        <div className="apropos-item">
          <span className="apropos-label">{t("apropos.createur")}</span>
          <span className="apropos-valeur">Alpha Coulibaly</span>
        </div>
        <div className="apropos-item">
          <span className="apropos-label">{t("apropos.contact")}</span>
          <a href="mailto:zinkcontact8@gmail.com" className="apropos-valeur apropos-lien">
            zinkcontact8@gmail.com
          </a>
        </div>
        <div className="apropos-item">
          <span className="apropos-label">{t("apropos.version")}</span>
          <span className="apropos-valeur">1.0.0</span>
        </div>
      </div>

      <div className="apropos-description">
        <p>{t("apropos.description")}</p>
      </div>

      <div
        className="apropos-item"
        style={{ cursor: "pointer" }}
        onClick={() => window.open("/politique-confidentialite", "_blank")}
      >
        <span className="apropos-label">{t("politique.titre")}</span>
        <span className="apropos-valeur">→</span>
      </div>

      <div className="apropos-footer">
        <p>{t("apropos.droitsReserves")}</p>
      </div>
    </div>
  );
}

export default APropos;