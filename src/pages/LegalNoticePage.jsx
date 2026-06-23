import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function LegalNoticePage() {
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

        <h1 className="text-3xl font-bold text-white mb-2">{isEs ? 'Aviso Legal' : 'Legal Notice'}</h1>
        <p className="text-sm text-brand-text-tertiary mb-10">{isEs ? 'Última actualización: junio de 2026' : 'Last updated: June 2026'}</p>

        <div className="prose prose-invert max-w-none space-y-8 text-sm text-brand-text-secondary leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '1. Datos Identificativos del Titular' : '1. Identifying Data of the Owner'}</h2>
            <ul className="space-y-1 pl-4 list-disc list-inside">
              <li><strong className="text-white">{isEs ? 'Titular del sitio web:' : 'Website Owner:'}</strong> TODODJS LLC</li>
              <li><strong className="text-white">{isEs ? 'Dirección:' : 'Address:'}</strong> 4111 Hollowtrail Dr, Tampa, FL, United States</li>
              <li><strong className="text-white">{isEs ? 'Correo electrónico:' : 'Email:'}</strong> contacto.tododjs@gmail.com</li>
              <li><strong className="text-white">{isEs ? 'Sitio web:' : 'Website:'}</strong> www.tododjs.com</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '2. Objeto y Ámbito de Aplicación' : '2. Object and Scope of Application'}</h2>
            <p>
              {isEs
                ? 'El presente Aviso Legal regula el acceso y uso de la plataforma TodoDJS, disponible en el dominio www.tododjs.com.'
                : 'This Legal Notice regulates the access and use of the TodoDJS platform, available at the domain www.tododjs.com.'}
            </p>
            <p className="mt-2">
              {isEs
                ? 'El acceso y uso del sitio web implica la aceptación plena y sin reservas de estas condiciones.'
                : 'The access and use of the website implies full and unreserved acceptance of these conditions.'}
            </p>
            <p className="mt-2">
              {isEs
                ? 'TodoDJS es una plataforma digital dirigida a DJs y usuarios relacionados con la industria musical, que ofrece acceso a contenidos digitales y recursos disponibles a través de diferentes planes de suscripción.'
                : 'TodoDJS is a digital platform aimed at DJs and users related to the music industry, offering access to digital content and resources available through various subscription plans.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '3. Propiedad Intelectual y Uso del Servicio' : '3. Intellectual Property and Use of the Service'}</h2>
            <p>
              {isEs
                ? 'Todos los elementos de la plataforma, incluidos el diseño, la interfaz, los logotipos, los textos y la estructura del sitio web, pertenecen a TodoDJS o a sus respectivos titulares.'
                : 'All elements of the platform, including design, interface, logos, texts, and website structure, belong to TodoDJS or its respective owners.'}
            </p>
            <p className="mt-2">
              {isEs
                ? 'El acceso a la plataforma y a sus contenidos está limitado exclusivamente a los usuarios registrados dentro de los términos de la suscripción contratada.'
                : 'Access to the platform and its contents is limited exclusively to registered users within the terms of the contracted subscription.'}
            </p>
            <p className="mt-3">{isEs ? 'Está prohibido:' : 'It is prohibited to:'}</p>
            <ul className="mt-2 space-y-1 pl-4 list-disc list-inside">
              {isEs ? (
                <>
                  <li>Redistribuir o compartir contenido descargado con terceros</li>
                  <li>Revender archivos obtenidos de la plataforma</li>
                  <li>Usar sistemas automatizados o herramientas de descarga masiva</li>
                  <li>Compartir cuentas o accesos fuera de los límites permitidos por el plan contratado</li>
                </>
              ) : (
                <>
                  <li>Redistribute or share downloaded content with third parties</li>
                  <li>Resell files obtained from the platform</li>
                  <li>Use automated systems or bulk download tools</li>
                  <li>Share accounts or access outside the limits permitted by the contracted plan</li>
                </>
              )}
            </ul>
            <p className="mt-3">
              {isEs
                ? 'TodoDJS podrá suspender o cancelar cuentas en las que se detecte actividad abusiva, uso indebido del servicio o incumplimiento de estos términos. Los usuarios son responsables del uso que hagan de los contenidos y recursos accesibles a través de la plataforma.'
                : 'TodoDJS may suspend or cancel accounts that detect abusive activity, misuse of the service, or non-compliance with these terms. Users are responsible for the use they make of the content and resources accessible through the platform.'}
            </p>
            <p className="mt-3">
              {isEs
                ? 'La plataforma emplea un sistema automático de monitorización de patrones de descarga para proteger el contenido frente a extracciones masivas. Este sistema detecta comportamientos incompatibles con el uso legítimo y puede aplicar pausas temporales o, en caso de reincidencia, la suspensión permanente de la cuenta. Véase la Sección 14 de los Términos y Condiciones para más información.'
                : 'The platform employs an automated download pattern monitoring system to protect content against mass extraction. This system detects behaviour incompatible with legitimate use and may apply temporary pauses or, in case of repeated violations, permanent account suspension. See Section 14 of the Terms and Conditions for full details.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '4. Condiciones de Acceso y Uso' : '4. Conditions of Access and Use'}</h2>
            <p>
              {isEs
                ? 'El acceso a determinadas funciones de TodoDJS requiere la creación de una cuenta de usuario y la contratación de un plan de suscripción. El usuario se compromete a:'
                : 'Access to certain functions of TodoDJS requires the creation of a user account and the contracting of a subscription plan. The user undertakes to:'}
            </p>
            <ul className="mt-3 space-y-1 pl-4 list-disc list-inside">
              {isEs ? (
                <>
                  <li>Proporcionar información veraz y actualizada</li>
                  <li>Mantener la confidencialidad de sus credenciales de acceso</li>
                  <li>No compartir cuentas fuera de los límites permitidos por el plan contratado</li>
                  <li>No realizar actividades que puedan afectar al normal funcionamiento de la plataforma</li>
                </>
              ) : (
                <>
                  <li>Provide truthful and up-to-date information</li>
                  <li>Maintain the confidentiality of their access credentials</li>
                  <li>Not share accounts outside the limits permitted by the contracted plan</li>
                  <li>Not engage in activities that may affect the normal operation of the platform</li>
                </>
              )}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '5. Exclusión de Responsabilidad' : '5. Exclusion of Liability'}</h2>
            <p>
              {isEs
                ? 'TodoDJS no se responsabilizará de los daños o pérdidas derivados del uso incorrecto de la plataforma ni de las interrupciones ajenas a su control razonable, incluidos fallos técnicos, incidencias de red, mantenimiento o causas de fuerza mayor.'
                : 'TodoDJS will not be liable for damages or losses arising from the incorrect use of the platform or from interruptions beyond its reasonable control, including technical failures, network incidents, maintenance, or force majeure causes.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '6. Legislación Aplicable y Jurisdicción' : '6. Applicable Legislation and Jurisdiction'}</h2>
            <p>
              {isEs
                ? 'Estas condiciones se regirán e interpretarán de conformidad con la legislación aplicable en el estado de Florida, Estados Unidos.'
                : 'These conditions will be governed and interpreted in accordance with the applicable legislation in the state of Florida, United States.'}
            </p>
            <p className="mt-2">
              {isEs
                ? 'Cualquier controversia relacionada con el acceso o uso de la plataforma quedará sujeta a la jurisdicción competente correspondiente al domicilio legal de TODODJS LLC, salvo que sean de aplicación disposiciones legales obligatorias.'
                : 'Any dispute related to the access or use of the platform will be subject to the competent jurisdiction corresponding to the legal address of TODODJS LLC, unless applicable mandatory legal provisions apply.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '7. Modificaciones' : '7. Modifications'}</h2>
            <p>
              {isEs
                ? 'TodoDJS se reserva el derecho de modificar este Aviso Legal en cualquier momento. Las modificaciones entrarán en vigor desde su publicación en el sitio web.'
                : 'TodoDJS reserves the right to modify this Legal Notice at any time. The modifications will come into effect from their publication on the website.'}
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
