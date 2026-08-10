import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

function PolitiqueConfidentialite() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const sections = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="politique-container">
      <div className="jeu-header">
        <button
          className="chat-retour"
          onClick={() => {
            if (window.history.length > 1) navigate(-1);
            else window.close();
          }}
        >
          ←
        </button>
        <h2 className="jeu-titre">{t("politique.titre")}</h2>
      </div>

      <p className="politique-maj">{t("politique.derniereMaj")}</p>

      <div className="politique-sommaire">
        <p className="politique-sommaire-titre">{t("politique.sommaire")}</p>
        {sections.map((n) => (
          <button
            key={n}
            className="politique-sommaire-item"
            onClick={() => scrollTo(`section-${n}`)}
          >
            {t(`politique.section${n}Titre`)}
          </button>
        ))}
      </div>

      {sections.map((n) => (
        <div key={n} id={`section-${n}`} className="politique-section">
          <h3 className="politique-section-titre">{t(`politique.section${n}Titre`)}</h3>
          <p className="politique-section-texte">{t(`politique.section${n}Texte`)}</p>
          {n === 6 && (
            <p className="politique-section-texte">{t("politique.section6Texte2")}</p>
          )}
        </div>
      ))}

      <div className="apropos-footer">
        <p>{t("apropos.droitsReserves")}</p>
      </div>
    </div>
  );
}

export default PolitiqueConfidentialite;