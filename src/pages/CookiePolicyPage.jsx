import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function CookiePolicyPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isEs = i18n.language?.startsWith('es');

  return (
    <div className="min-h-screen bg-dark-bg">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-brand-text-tertiary hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {isEs ? 'Volver' : 'Back'}
        </button>

        <h1 className="text-3xl font-bold text-white mb-2">{isEs ? 'Política de Cookies' : 'Cookie Policy'}</h1>
        <p className="text-sm text-brand-text-tertiary mb-10">{isEs ? 'Última actualización: enero de 2025' : 'Last updated: January 2025'}</p>

        <div className="space-y-8 text-sm text-brand-text-secondary leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '1. ¿Qué son las Cookies?' : '1. What are Cookies?'}</h2>
            <p>
              {isEs
                ? 'Las cookies son pequeños ficheros de texto que se almacenan en el dispositivo del usuario cuando visita un sitio web. Su función es recordar preferencias, mantener sesiones activas y recopilar información estadística sobre el uso del sitio, entre otras finalidades.'
                : 'Cookies are small text files stored on the user\'s device when visiting a website. They are used to remember preferences, keep sessions active and collect statistical information about site usage, among other purposes.'}
            </p>
            <p className="mt-2">
              {isEs
                ? 'La presente Política de Cookies se aplica al sitio web www.tododjs.com y se rige por el Reglamento (UE) 2016/679 (RGPD), la Ley Orgánica 3/2018 (LOPDGDD) y la Ley 34/2002 (LSSICE).'
                : 'This Cookie Policy applies to www.tododjs.com and is governed by Regulation (EU) 2016/679 (GDPR), Organic Law 3/2018 (LOPDGDD) and Law 34/2002 (LSSICE).'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '2. Tipos de Cookies que Utilizamos' : '2. Types of Cookies We Use'}</h2>

            <h3 className="text-sm font-semibold text-white/80 mt-4 mb-2">{isEs ? '2.1 Cookies Técnicas (necesarias)' : '2.1 Technical Cookies (necessary)'}</h3>
            <p>
              {isEs
                ? 'Son imprescindibles para el funcionamiento del sitio web. Sin ellas no sería posible navegar ni utilizar los servicios. No requieren consentimiento previo del usuario.'
                : 'These are essential for the website to function. Without them it would not be possible to browse or use the services. They do not require prior user consent.'}
            </p>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 pr-3 text-white font-semibold">{isEs ? 'Nombre' : 'Name'}</th>
                    <th className="text-left py-2 pr-3 text-white font-semibold">{isEs ? 'Finalidad' : 'Purpose'}</th>
                    <th className="text-left py-2 text-white font-semibold">{isEs ? 'Duración' : 'Duration'}</th>
                  </tr>
                </thead>
                <tbody>
                  {(isEs ? [
                    ['token (localStorage)', 'Autenticación del usuario — almacena el JWT de sesión', 'Sesión / 7 días'],
                    ['i18nextLng', 'Preferencia de idioma del usuario', 'Persistente'],
                  ] : [
                    ['token (localStorage)', 'User authentication — stores the session JWT', 'Session / 7 days'],
                    ['i18nextLng', 'User language preference', 'Persistent'],
                  ]).map(([name, fin, dur]) => (
                    <tr key={name} className="border-b border-white/5">
                      <td className="py-2 pr-3 font-mono text-accent/80">{name}</td>
                      <td className="py-2 pr-3 text-brand-text-tertiary">{fin}</td>
                      <td className="py-2 text-brand-text-tertiary">{dur}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="text-sm font-semibold text-white/80 mt-6 mb-2">{isEs ? '2.2 Cookies de Preferencias' : '2.2 Preference Cookies'}</h3>
            <p>
              {isEs
                ? 'Permiten recordar configuraciones del usuario (idioma, volumen del reproductor, filtros activos) para mejorar la experiencia de uso.'
                : 'These allow user settings to be remembered (language, player volume, active filters) to improve the user experience.'}
            </p>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 pr-3 text-white font-semibold">{isEs ? 'Nombre' : 'Name'}</th>
                    <th className="text-left py-2 pr-3 text-white font-semibold">{isEs ? 'Finalidad' : 'Purpose'}</th>
                    <th className="text-left py-2 text-white font-semibold">{isEs ? 'Duración' : 'Duration'}</th>
                  </tr>
                </thead>
                <tbody>
                  {(isEs ? [
                    ['playerVolume', 'Volumen del reproductor de audio', 'Persistente'],
                    ['activeGenre', 'Último filtro de género seleccionado', 'Sesión'],
                  ] : [
                    ['playerVolume', 'Audio player volume', 'Persistent'],
                    ['activeGenre', 'Last selected genre filter', 'Session'],
                  ]).map(([name, fin, dur]) => (
                    <tr key={name} className="border-b border-white/5">
                      <td className="py-2 pr-3 font-mono text-accent/80">{name}</td>
                      <td className="py-2 pr-3 text-brand-text-tertiary">{fin}</td>
                      <td className="py-2 text-brand-text-tertiary">{dur}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="text-sm font-semibold text-white/80 mt-6 mb-2">{isEs ? '2.3 Cookies de Terceros' : '2.3 Third-Party Cookies'}</h3>
            <p>
              {isEs
                ? 'Algunos servicios integrados en la plataforma pueden instalar sus propias cookies:'
                : 'Some services integrated into the platform may install their own cookies:'}
            </p>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 pr-3 text-white font-semibold">{isEs ? 'Proveedor' : 'Provider'}</th>
                    <th className="text-left py-2 pr-3 text-white font-semibold">{isEs ? 'Finalidad' : 'Purpose'}</th>
                    <th className="text-left py-2 text-white font-semibold">{isEs ? 'Más información' : 'More info'}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Stripe Inc.', 'Procesamiento seguro de pagos y prevención de fraude', 'stripe.com/privacy'],
                  ].map(([prov, fin, url]) => (
                    <tr key={prov} className="border-b border-white/5">
                      <td className="py-2 pr-3 text-white">{prov}</td>
                      <td className="py-2 pr-3 text-brand-text-tertiary">{fin}</td>
                      <td className="py-2">
                        <a href={`https://${url}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                          {url}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '3. Gestión y Configuración de Cookies' : '3. Cookie Management and Settings'}</h2>
            <p>
              {isEs
                ? 'Puedes configurar o deshabilitar las cookies en cualquier momento desde los ajustes de tu navegador. Ten en cuenta que desactivar las cookies técnicas puede impedir el correcto funcionamiento del sitio.'
                : 'You can configure or disable cookies at any time from your browser settings. Please note that disabling technical cookies may prevent the site from functioning correctly.'}
            </p>
            <ul className="mt-3 space-y-2 pl-4 list-disc list-inside">
              <li>
                <strong className="text-white">Google Chrome:</strong>{' '}
                Ajustes → Privacidad y seguridad → Cookies y otros datos de sitios
              </li>
              <li>
                <strong className="text-white">Mozilla Firefox:</strong>{' '}
                Opciones → Privacidad y seguridad → Cookies y datos del sitio
              </li>
              <li>
                <strong className="text-white">Safari:</strong>{' '}
                Preferencias → Privacidad → Gestión de datos del sitio web
              </li>
              <li>
                <strong className="text-white">Microsoft Edge:</strong>{' '}
                Configuración → Cookies y permisos del sitio
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '4. Consentimiento' : '4. Consent'}</h2>
            <p>
              {isEs
                ? 'Al continuar navegando por este sitio web o al hacer clic en «Aceptar» en el banner de cookies, consientes el uso de las cookies no técnicas descritas en esta política. Puedes retirar tu consentimiento en cualquier momento borrando las cookies de tu navegador.'
                : 'By continuing to browse this website or clicking “Accept” on the cookie banner, you consent to the use of non-technical cookies described in this policy. You may withdraw your consent at any time by deleting cookies from your browser.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '5. Actualizaciones de esta Política' : '5. Policy Updates'}</h2>
            <p>
              {isEs
                ? 'TodoDJS se reserva el derecho de actualizar esta Política de Cookies para adaptarla a cambios legislativos o a nuevas funcionalidades de la plataforma. Las modificaciones se publicarán en esta misma página con indicación de la fecha de última actualización.'
                : 'TodoDJS reserves the right to update this Cookie Policy to adapt to legislative changes or new platform features. Changes will be published on this page with the date of last update.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '6. Contacto' : '6. Contact'}</h2>
            <p>
              {isEs ? 'Para cualquier consulta sobre esta política, puedes contactarnos en' : 'For any queries about this policy, you can contact us at'}{' '}
              <a href="mailto:contacto.tododjs@gmail.com" className="text-accent hover:underline">
                contacto.tododjs@gmail.com
              </a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
