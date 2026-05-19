import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function TermsPage() {
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

        <h1 className="text-3xl font-bold text-white mb-2">{isEs ? 'Términos y Condiciones' : 'Terms and Conditions'}</h1>
        <p className="text-sm text-brand-text-tertiary mb-10">{isEs ? 'Última actualización: enero de 2025' : 'Last updated: January 2025'}</p>

        <div className="space-y-8 text-sm text-brand-text-secondary leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '1. Partes del Contrato' : '1. Parties to the Agreement'}</h2>
            <p>
              <strong className="text-white">TodoDJS</strong>{' '}
              {isEs
                ? 'regula la relación contractual con cualquier persona física o jurídica que utilice la plataforma (en adelante, «el usuario»).'
                : 'governs the contractual relationship with any individual or legal entity using the platform (hereinafter “the user”).'}
            </p>
            <p className="mt-2">
              {isEs
                ? 'El acceso a la plataforma implica la aceptación íntegra de estos Términos. Si no estás de acuerdo, debes abstenerte de utilizar el servicio.'
                : 'Accessing the platform implies full acceptance of these Terms. If you do not agree, you must refrain from using the service.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '2. Descripción del Servicio' : '2. Service Description'}</h2>
            <p>
              {isEs
                ? 'TodoDJS es una plataforma de música digital que proporciona a los usuarios registrados acceso a pistas de audio, mashups y recursos para uso profesional en actuaciones de DJ. El acceso completo está condicionado a la contratación de uno de los planes disponibles.'
                : 'TodoDJS is a digital music platform providing registered users access to audio tracks, mashups and resources for professional DJ use. Full access requires subscribing to one of the available plans.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '3. Registro y Cuenta de Usuario' : '3. Registration and User Account'}</h2>
            <p>{isEs ? 'Para utilizar los servicios de pago, el usuario debe crear una cuenta proporcionando:' : 'To use paid services, the user must create an account providing:'}</p>
            <ul className="mt-2 space-y-1 pl-4 list-disc list-inside">
              {isEs ? (
                <><li>Nombre completo o nombre artístico</li><li>Dirección de correo electrónico válida</li><li>Contraseña segura</li></>
              ) : (
                <><li>Full name or artist name</li><li>Valid email address</li><li>Secure password</li></>
              )}
            </ul>
            <p className="mt-3">
              {isEs
                ? 'El usuario es responsable de mantener la confidencialidad de sus credenciales. En caso de uso no autorizado, debe notificarlo inmediatamente a'
                : 'The user is responsible for keeping their credentials confidential. In case of unauthorised use, they must notify'}{' '}
              <a href="mailto:contacto.tododjs@gmail.com" className="text-accent hover:underline">contacto.tododjs@gmail.com</a>
              {isEs ? '.' : ' immediately.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '4. Planes de Suscripción' : '4. Subscription Plans'}</h2>
            <p>{isEs ? 'TodoDJS ofrece los siguientes tipos de plan:' : 'TodoDJS offers the following plan types:'}</p>
            <div className="mt-3 space-y-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="font-semibold text-white mb-1">{isEs ? 'Individual Mensual' : 'Individual Monthly'}</p>
                <p className="text-xs text-brand-text-tertiary">
                  {isEs
                    ? 'Acceso completo para 1 dispositivo registrado. Renovación automática mensual. Cancelable en cualquier momento con acceso hasta fin del período pagado.'
                    : 'Full access for 1 registered device. Automatic monthly renewal. Cancellable at any time with access until the end of the paid period.'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="font-semibold text-white mb-1">{isEs ? 'Shared (Compartido) — Mensual y Trimestral' : 'Shared — Monthly and Quarterly'}</p>
                <p className="text-xs text-brand-text-tertiary">
                  {isEs
                    ? 'Acceso para hasta 2 dispositivos registrados. Permite compartir con un segundo usuario. Renovación automática según el ciclo contratado.'
                    : 'Access for up to 2 registered devices. Can be shared with a second user. Automatic renewal per contracted billing cycle.'}
                </p>
              </div>
            </div>
            <p className="mt-3">
              {isEs
                ? 'Los precios están disponibles en la página de precios y pueden modificarse con 30 días de preaviso.'
                : 'Prices are available on the pricing page and may be modified with 30 days\u2019 notice to active subscribers.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '5. Pagos y Facturación' : '5. Payments and Billing'}</h2>
            <p>
              <strong className="text-white">Stripe Inc.</strong>{' '}
              {isEs
                ? 'procesa los pagos (certificado PCI-DSS). TodoDJS no almacena datos de tarjetas bancarias.'
                : 'processes payments (PCI-DSS certified). TodoDJS does not store bank card data.'}
            </p>
            <ul className="mt-3 space-y-2 pl-4 list-disc list-inside">
              {isEs ? (
                <>
                  <li>Las suscripciones se renuevan automáticamente al final de cada período salvo cancelación previa.</li>
                  <li>El cargo se realiza en la tarjeta asociada a la cuenta en la fecha de renovación.</li>
                  <li>Si el pago falla, Stripe realizará hasta 3 reintentos automáticos en los días siguientes.</li>
                  <li>Durante el período de reintento, el acceso puede quedar suspendido temporalmente.</li>
                  <li>Al recuperar el pago, el acceso se restaura automáticamente sin intervención manual.</li>
                  <li>Se enviará un recibo por correo electrónico tras cada cargo exitoso.</li>
                </>
              ) : (
                <>
                  <li>Subscriptions renew automatically at the end of each period unless cancelled beforehand.</li>
                  <li>The charge is made to the card linked to the account on the renewal date.</li>
                  <li>If payment fails, Stripe will make up to 3 automatic retries over the following days.</li>
                  <li>During the retry period, access may be temporarily suspended.</li>
                  <li>Once payment is recovered, access is automatically restored with no manual intervention.</li>
                  <li>A receipt will be sent by email after each successful charge.</li>
                </>
              )}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '6. Cancelación y Reembolsos' : '6. Cancellation and Refunds'}</h2>
            <p>
              {isEs
                ? 'El usuario puede cancelar su suscripción en cualquier momento desde el panel de gestión de suscripción. La cancelación surte efecto al final del período de facturación en curso, conservando el acceso hasta esa fecha.'
                : 'Users may cancel their subscription at any time from the subscription management panel. Cancellation takes effect at the end of the current billing period, with access retained until that date.'}
            </p>
            <p className="mt-2">
              <strong className="text-white">{isEs ? 'Política de reembolsos:' : 'Refund policy:'}</strong>{' '}
              {isEs
                ? 'Los cargos ya realizados no son reembolsables salvo en los siguientes casos:'
                : 'Charges already made are non-refundable except in the following cases:'}
            </p>
            <ul className="mt-2 space-y-1 pl-4 list-disc list-inside">
              {isEs ? (
                <>
                  <li>Error técnico imputable a TodoDJS que haya impedido el acceso al servicio durante un período significativo.</li>
                  <li>Duplicidad de cargo demostrable.</li>
                  <li>Derecho de desistimiento en compras realizadas por consumidores en la Unión Europea dentro de los 14 días naturales desde la contratación, siempre que no se haya hecho uso del servicio (Art. 103.a) TRLGDCU).</li>
                </>
              ) : (
                <>
                  <li>Technical error attributable to TodoDJS that prevented access to the service for a significant period.</li>
                  <li>Demonstrable duplicate charge.</li>
                  <li>Right of withdrawal for purchases made by consumers in the European Union within 14 calendar days of contracting, provided the service has not been used (Art. 103.a TRLGDCU).</li>
                </>
              )}
            </ul>
            <p className="mt-2">
              {isEs ? 'Para solicitar un reembolso, contacta con' : 'To request a refund, contact'}{' '}
              <a href="mailto:contacto.tododjs@gmail.com" className="text-accent hover:underline">
                contacto.tododjs@gmail.com
              </a>{' '}
              {isEs ? 'indicando tu email de cuenta y el motivo de la solicitud.' : 'with your account email and the reason for the request.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '7. Licencia de Uso del Contenido' : '7. Content Licence'}</h2>
            <p>
              {isEs
                ? 'La suscripción otorga al usuario una licencia personal, intransferible y no exclusiva para acceder y descargar los contenidos musicales disponibles en la plataforma, exclusivamente para:'
                : 'The subscription grants the user a personal, non-transferable and non-exclusive licence to access and download musical content on the platform, exclusively for:'}
            </p>
            <ul className="mt-2 space-y-1 pl-4 list-disc list-inside">
              {isEs ? (
                <><li>Uso en actuaciones de DJ en directo (clubs, eventos, bodas, etc.).</li><li>Mezclas privadas no distribuidas comercialmente.</li></>
              ) : (
                <><li>Use in live DJ performances (clubs, events, weddings, etc.).</li><li>Private mixes not distributed commercially.</li></>
              )}
            </ul>
            <p className="mt-3 font-semibold text-white/80">{isEs ? 'Queda expresamente prohibido:' : 'The following is expressly prohibited:'}</p>
            <ul className="mt-2 space-y-1 pl-4 list-disc list-inside">
              {isEs ? (
                <>
                  <li>Redistribuir, revender o compartir los archivos descargados con terceros.</li>
                  <li>Publicar el contenido en plataformas de streaming (Spotify, Apple Music, YouTube, etc.).</li>
                  <li>Utilizar las pistas en producciones comerciales sin licencia adicional.</li>
                  <li>Hacer ingeniería inversa o extraer samples para nuevas producciones.</li>
                </>
              ) : (
                <>
                  <li>Redistributing, reselling or sharing downloaded files with third parties.</li>
                  <li>Publishing content on streaming platforms (Spotify, Apple Music, YouTube, etc.).</li>
                  <li>Using tracks in commercial productions without an additional licence.</li>
                  <li>Reverse engineering or extracting samples for new productions.</li>
                </>
              )}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '8. Límite de Dispositivos' : '8. Device Limit'}</h2>
            <p>
              {isEs
                ? 'Cada plan permite el acceso desde un número máximo de dispositivos registrados. El intento de conexión desde un dispositivo adicional será bloqueado y el titular de la cuenta recibirá una notificación por email. El titular puede gestionar y eliminar dispositivos desde su panel de suscripción.'
                : 'Each plan allows access from a maximum number of registered devices. Attempts to connect from an additional device will be blocked and the account holder will receive an email notification. The holder can manage and remove devices from their subscription panel.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '9. Uso Aceptable' : '9. Acceptable Use'}</h2>
            <p>{isEs ? 'El usuario se compromete a no:' : 'The user agrees not to:'}</p>
            <ul className="mt-2 space-y-1 pl-4 list-disc list-inside">
              {isEs ? (
                <>
                  <li>Usar scrapers, bots o sistemas automatizados para descargar contenidos masivamente.</li>
                  <li>Intentar acceder a partes restringidas de la plataforma sin autorización.</li>
                  <li>Compartir su contraseña o credenciales con terceros.</li>
                  <li>Realizar cualquier actividad que perjudique la disponibilidad o integridad del servicio.</li>
                  <li>Infringir derechos de propiedad intelectual de terceros.</li>
                </>
              ) : (
                <>
                  <li>Use scrapers, bots or automated systems to download content in bulk.</li>
                  <li>Attempt to access restricted parts of the platform without authorisation.</li>
                  <li>Share their password or credentials with third parties.</li>
                  <li>Carry out any activity that harms the availability or integrity of the service.</li>
                  <li>Infringe third-party intellectual property rights.</li>
                </>
              )}
            </ul>
            <p className="mt-3">
              {isEs
                ? 'El incumplimiento de estas condiciones podrá resultar en la suspensión o cancelación inmediata de la cuenta sin derecho a reembolso.'
                : 'Breach of these conditions may result in immediate account suspension or cancellation with no right to a refund.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '10. Suspensión y Cancelación de Cuenta' : '10. Account Suspension and Cancellation'}</h2>
            <p>
              {isEs
                ? 'TodoDJS se reserva el derecho de suspender o cancelar cuentas de usuario en los siguientes supuestos:'
                : 'TodoDJS reserves the right to suspend or cancel user accounts in the following cases:'}
            </p>
            <ul className="mt-2 space-y-1 pl-4 list-disc list-inside">
              {isEs ? (
                <>
                  <li>Incumplimiento de los presentes Términos.</li>
                  <li>Impago de la suscripción tras los reintentos automáticos.</li>
                  <li>Uso fraudulento o actividad ilícita.</li>
                  <li>Solicitud expresa del usuario.</li>
                </>
              ) : (
                <>
                  <li>Breach of these Terms.</li>
                  <li>Non-payment of the subscription after automatic retries.</li>
                  <li>Fraudulent use or unlawful activity.</li>
                  <li>Express request by the user.</li>
                </>
              )}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '11. Responsabilidad' : '11. Liability'}</h2>
            <p>
              {isEs
                ? 'TodoDJS no garantiza la disponibilidad ininterrumpida del servicio, si bien se compromete a minimizar las interrupciones y a notificar los mantenimientos programados con antelación razonable.'
                : 'TodoDJS does not guarantee uninterrupted service availability, but commits to minimising interruptions and notifying scheduled maintenance with reasonable advance notice.'}
            </p>
            <p className="mt-2">
              {isEs
                ? 'La responsabilidad total de TodoDJS frente al usuario, por cualquier causa, no podrá exceder el importe abonado por el usuario en los últimos 3 meses de suscripción.'
                : 'The total liability of TodoDJS towards the user, for any cause, shall not exceed the amount paid by the user in the last 3 months of subscription.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '12. Modificación de los Términos' : '12. Amendment of Terms'}</h2>
            <p>
              {isEs
                ? 'TodoDJS podrá modificar los presentes Términos notificándolo al usuario con al menos 15 días de antelación por correo electrónico. Si el usuario continúa utilizando el servicio tras la entrada en vigor de las modificaciones, se entenderá que las acepta.'
                : 'TodoDJS may amend these Terms by notifying the user at least 15 days in advance by email. If the user continues using the service after the amendments take effect, they are deemed to have accepted them.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '13. Legislación Aplicable y Fuero' : '13. Applicable Law and Jurisdiction'}</h2>
            <p>
              {isEs
                ? 'Estos Términos se rigen por la legislación española. Para la resolución de cualquier controversia, las partes se someten a los Juzgados y Tribunales españoles competentes, sin perjuicio de los derechos que la normativa de consumo vigente reconozca al usuario como consumidor.'
                : 'These Terms are governed by Spanish law. For the resolution of any dispute, the parties submit to the competent Spanish Courts and Tribunals, without prejudice to the rights granted to users as consumers under applicable consumer law.'}
            </p>
            <p className="mt-2">
              {isEs
                ? 'Normativa de referencia: Ley 34/2002 (LSSICE), Real Decreto Legislativo 1/2007 (TRLGDCU), Reglamento (UE) 2016/679 (RGPD), Ley Orgánica 3/2018 (LOPDGDD).'
                : 'Reference legislation: Law 34/2002 (LSSICE), Royal Legislative Decree 1/2007 (TRLGDCU), Regulation (EU) 2016/679 (GDPR), Organic Law 3/2018 (LOPDGDD).'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '14. Contacto' : '14. Contact'}</h2>
            <p>
              {isEs ? 'Para cualquier consulta sobre estos Términos:' : 'For any queries about these Terms:'}{' '}
              <a href="mailto:contacto.tododjs@gmail.com" className="text-accent hover:underline">
                contacto.tododjs@gmail.com
              </a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
