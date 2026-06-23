import { useT } from '../i18n'

const LANGS = [
  { code: 'en', label: 'EN', full: 'English' },
  { code: 'es', label: 'ES', full: 'Español' },
  { code: 'fr', label: 'FR', full: 'Français' },
  { code: 'pt', label: 'PT', full: 'Português' },
]

export default function LanguageSwitcher() {
  const { lang, setLang } = useT()
  return (
    <div className="lang-switcher">
      {LANGS.map(l => (
        <button
          key={l.code}
          className={`lang-btn ${lang === l.code ? 'active' : ''}`}
          onClick={() => setLang(l.code)}
          title={l.full}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}