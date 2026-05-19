import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function PrivacyPolicyPage() {
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

        <h1 className="text-3xl font-bold text-white mb-2">{isEs ? 'Política de Privacidad' : 'Privacy Policy'}</h1>
        <p className="text-sm text-brand-text-tertiary mb-10">{isEs ? 'Última actualización: enero de 2025' : 'Last updated: January 2025'}</p>

        <div className="space-y-8 text-sm text-brand-text-secondary leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '1. Responsable del Tratamiento' : '1. Data Controller'}</h2>
            <ul className="space-y-1 pl-4 list-disc list-inside">
              <li><strong className="text-white">Responsable:</strong> TodoDJS</li>
              <li><strong className="text-white">NIF/CIF:</strong> [INDICAR NIF O CIF]</li>
              <li><strong className="text-white">Dirección:</strong> [INDICAR DIRECCIÓN COMPLETA], España</li>
              <li><strong className="text-white">Email de contacto:</strong> contacto.tododjs@gmail.com</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '2. Datos que Recabamos' : '2. Data We Collect'}</h2>
            <p>{isEs ? 'Recogemos los siguientes datos personales:' : 'We collect the following personal data:'}</p>
            <ul className="mt-3 space-y-2 pl-4 list-disc list-inside">
              {isEs ? (
                <>
                  <li><strong className="text-white">Datos de registro:</strong> nombre, dirección de correo electrónico y contraseña (almacenada de forma cifrada).</li>
                  <li><strong className="text-white">Datos de contacto:</strong> número de teléfono (opcional).</li>
                  <li><strong className="text-white">Datos de pago:</strong> procesados exclusivamente por Stripe Inc. TodoDJS no almacena datos de tarjetas bancarias. Stripe actúa como encargado del tratamiento bajo sus propias certificaciones PCI-DSS.</li>
                  <li><strong className="text-white">Datos de uso:</strong> páginas visitadas, pistas reproducidas y descargadas, dispositivos registrados e IP de acceso.</li>
                  <li><strong className="text-white">Datos de suscripción:</strong> plan contratado, fecha de inicio, fecha de vencimiento y estado de la suscripción.</li>
                </>
              ) : (
                <>
                  <li><strong className="text-white">Registration data:</strong> name, email address and password (stored encrypted).</li>
                  <li><strong className="text-white">Contact data:</strong> phone number (optional).</li>
                  <li><strong className="text-white">Payment data:</strong> processed exclusively by Stripe Inc. TodoDJS does not store bank card details. Stripe acts as data processor under its own PCI-DSS certifications.</li>
                  <li><strong className="text-white">Usage data:</strong> pages visited, tracks played and downloaded, registered devices and access IP.</li>
                  <li><strong className="text-white">Subscription data:</strong> contracted plan, start date, expiry date and subscription status.</li>
                </>
              )}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '3. Finalidad del Tratamiento' : '3. Purposes of Processing'}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse mt-2">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 pr-4 text-white font-semibold">Finalidad</th>
                    <th className="text-left py-2 pr-4 text-white font-semibold">Base jurídica</th>
                  </tr>
                </thead>
                <tbody className="space-y-1">
                  {(isEs ? [
                    ['Gestión del registro y acceso a la plataforma', 'Ejecución del contrato (Art. 6.1.b RGPD)'],
                    ['Gestión de suscripciones y cobros', 'Ejecución del contrato (Art. 6.1.b RGPD)'],
                    ['Envío de comunicaciones transaccionales (recibos, alertas de pago)', 'Ejecución del contrato (Art. 6.1.b RGPD)'],
                    ['Envío de novedades y ofertas (newsletter)', 'Consentimiento (Art. 6.1.a RGPD)'],
                    ['Control de fraude y seguridad', 'Interés legítimo (Art. 6.1.f RGPD)'],
                    ['Cumplimiento de obligaciones legales', 'Obligación legal (Art. 6.1.c RGPD)'],
                    ['Mejora del servicio y análisis de uso', 'Interés legítimo (Art. 6.1.f RGPD)'],
                  ] : [
                    ['Account registration and platform access management', 'Contract performance (Art. 6.1.b GDPR)'],
                    ['Subscription and billing management', 'Contract performance (Art. 6.1.b GDPR)'],
                    ['Sending transactional communications (receipts, payment alerts)', 'Contract performance (Art. 6.1.b GDPR)'],
                    ['Sending news and offers (newsletter)', 'Consent (Art. 6.1.a GDPR)'],
                    ['Fraud control and security', 'Legitimate interest (Art. 6.1.f GDPR)'],
                    ['Compliance with legal obligations', 'Legal obligation (Art. 6.1.c GDPR)'],
                    ['Service improvement and usage analysis', 'Legitimate interest (Art. 6.1.f GDPR)'],
                  ]).map(([fin, base]) => (
                    <tr key={fin} className="border-b border-white/5">
                      <td className="py-2 pr-4 align-top">{fin}</td>
                      <td className="py-2 align-top text-brand-text-tertiary">{base}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '4. Plazo de Conservación' : '4. Retention Period'}</h2>
            <p>
              {isEs
                ? 'Los datos se conservarán mientras la cuenta permanezca activa. Tras la cancelación de la cuenta, los datos se conservarán durante el plazo necesario para el cumplimiento de obligaciones legales (generalmente 5 años para datos fiscales y mercantiles). Los datos de navegación se eliminan tras 12 meses.'
                : 'Data will be retained for as long as the account remains active. After account cancellation, data will be kept for the period required to comply with legal obligations (generally 5 years for tax and commercial data). Navigation data is deleted after 12 months.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '5. Cesión de Datos a Terceros' : '5. Disclosure to Third Parties'}</h2>
            <p>{isEs ? 'No cedemos datos personales a terceros salvo en los siguientes casos:' : 'We do not share personal data with third parties except in the following cases:'}</p>
            <ul className="mt-3 space-y-2 pl-4 list-disc list-inside">
              {isEs ? (
                <>
                  <li><strong className="text-white">Stripe Inc.</strong> — procesamiento de pagos (EE. UU., bajo Cláusulas Contractuales Tipo).</li>
                  <li><strong className="text-white">Proveedores de almacenamiento en la nube</strong> — para alojar los archivos de audio (bajo acuerdos de encargo del tratamiento).</li>
                  <li><strong className="text-white">Autoridades competentes</strong> — cuando lo exija la ley.</li>
                </>
              ) : (
                <>
                  <li><strong className="text-white">Stripe Inc.</strong> — payment processing (USA, under Standard Contractual Clauses).</li>
                  <li><strong className="text-white">Cloud storage providers</strong> — to host audio files (under data processing agreements).</li>
                  <li><strong className="text-white">Competent authorities</strong> — when required by law.</li>
                </>
              )}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '6. Transferencias Internacionales' : '6. International Transfers'}</h2>
            <p>
              {isEs
                ? 'Stripe Inc. está establecida en EE. UU. La transferencia se realiza bajo las Cláusulas Contractuales Tipo aprobadas por la Comisión Europea, garantizando un nivel adecuado de protección de datos.'
                : 'Stripe Inc. is established in the USA. The transfer is made under Standard Contractual Clauses approved by the European Commission, ensuring an adequate level of data protection.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '7. Derechos del Interesado' : '7. Data Subject Rights'}</h2>
            <p>
              {isEs ? 'Puedes ejercer los siguientes derechos enviando un email a' : 'You may exercise the following rights by sending an email to'}{' '}
              <a href="mailto:contacto.tododjs@gmail.com" className="text-accent hover:underline">
                contacto.tododjs@gmail.com
              </a>{' '}
              {isEs ? 'con copia de tu documento de identidad:' : 'with a copy of your identity document:'}
            </p>
            <ul className="mt-3 space-y-1 pl-4 list-disc list-inside">
              {isEs ? (
                <>
                  <li><strong className="text-white">Acceso:</strong> obtener confirmación sobre si tratamos tus datos.</li>
                  <li><strong className="text-white">Rectificación:</strong> corregir datos inexactos.</li>
                  <li><strong className="text-white">Supresión:</strong> solicitar la eliminación de tus datos.</li>
                  <li><strong className="text-white">Oposición:</strong> oponerte al tratamiento basado en interés legítimo.</li>
                  <li><strong className="text-white">Limitación:</strong> solicitar la restricción del tratamiento.</li>
                  <li><strong className="text-white">Portabilidad:</strong> recibir tus datos en formato estructurado.</li>
                  <li><strong className="text-white">Retirada del consentimiento:</strong> en cualquier momento, sin efectos retroactivos.</li>
                </>
              ) : (
                <>
                  <li><strong className="text-white">Access:</strong> obtain confirmation of whether we process your data.</li>
                  <li><strong className="text-white">Rectification:</strong> correct inaccurate data.</li>
                  <li><strong className="text-white">Erasure:</strong> request deletion of your data.</li>
                  <li><strong className="text-white">Objection:</strong> object to processing based on legitimate interest.</li>
                  <li><strong className="text-white">Restriction:</strong> request restriction of processing.</li>
                  <li><strong className="text-white">Portability:</strong> receive your data in a structured format.</li>
                  <li><strong className="text-white">Withdrawal of consent:</strong> at any time, without retroactive effect.</li>
                </>
              )}
            </ul>
            <p className="mt-3">
              {isEs
                ? 'Si consideras que el tratamiento no es conforme al RGPD, puedes presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD) en'
                : 'If you believe the processing does not comply with the GDPR, you may lodge a complaint with the Spanish Data Protection Agency (AEPD) at'}{' '}
              <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                www.aepd.es
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '8. Seguridad' : '8. Security'}</h2>
            <p>
              {isEs
                ? 'Aplicamos medidas técnicas y organizativas apropiadas para proteger tus datos personales frente a acceso no autorizado, pérdida o divulgación: cifrado HTTPS, contraseñas hasheadas con bcrypt, autenticación por tokens JWT, y acceso restringido a datos de producción.'
                : 'We apply appropriate technical and organisational measures to protect your personal data against unauthorised access, loss or disclosure: HTTPS encryption, bcrypt-hashed passwords, JWT token authentication, and restricted access to production data.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '9. Menores de Edad' : '9. Minors'}</h2>
            <p>
              {isEs
                ? 'Los servicios de TodoDJS están dirigidos a mayores de 18 años. No recabamos conscientemente datos de menores. Si detectamos que un menor ha facilitado datos sin consentimiento parental, procederemos a su eliminación inmediata.'
                : 'TodoDJS services are intended for users aged 18 and over. We do not knowingly collect data from minors. If we detect that a minor has provided data without parental consent, we will delete it immediately.'}
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
