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
        <p className="text-sm text-brand-text-tertiary mb-10">{isEs ? 'Última actualización: enero de 2025' : 'Last updated: January 2025'}</p>

        <div className="prose prose-invert max-w-none space-y-8 text-sm text-brand-text-secondary leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '1. Datos Identificativos del Titular' : '1. Identifying Information'}</h2>
            <p>
              {isEs
                ? 'En cumplimiento con el artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSICE), se informa de los datos identificativos del titular del presente sitio web:'
                : 'In compliance with Article 10 of Law 34/2002 of 11 July on Information Society Services and Electronic Commerce (LSSICE), the identifying details of the website owner are provided below:'}
            </p>
            <ul className="mt-3 space-y-1 pl-4 list-disc list-inside">
              <li><strong className="text-white">Denominación social:</strong> TodoDJS</li>
              <li><strong className="text-white">NIF/CIF:</strong> [INDICAR NIF O CIF]</li>
              <li><strong className="text-white">Domicilio:</strong> [INDICAR DIRECCIÓN COMPLETA], España</li>
              <li><strong className="text-white">Correo electrónico:</strong> contacto.tododjs@gmail.com</li>
              <li><strong className="text-white">Sitio web:</strong> www.tododjs.com</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '2. Objeto y Ámbito de Aplicación' : '2. Purpose and Scope'}</h2>
            <p>
              {isEs
                ? 'El presente Aviso Legal regula el acceso y uso de la plataforma TodoDJS, disponible en el dominio www.tododjs.com, cuya titularidad corresponde a TodoDJS. El acceso al sitio web implica la aceptación plena y sin reservas de las presentes condiciones.'
                : 'This Legal Notice governs access to and use of the TodoDJS platform, available at www.tododjs.com, owned by TodoDJS. Accessing the website implies full and unconditional acceptance of these terms.'}
            </p>
            <p className="mt-2">
              {isEs
                ? 'TodoDJS es una plataforma digital destinada a DJs profesionales que ofrece acceso a recursos musicales, mashups y pistas de audio bajo distintos planes de suscripción.'
                : 'TodoDJS is a digital platform aimed at professional DJs, offering access to music resources, mashups and audio tracks under various subscription plans.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '3. Propiedad Intelectual e Industrial' : '3. Intellectual and Industrial Property'}</h2>
            <p>
              {isEs
                ? 'Todos los contenidos del sitio web (textos, imágenes, logotipos, código fuente, diseño gráfico, base de datos, etc.) son propiedad exclusiva de TodoDJS o de sus legítimos licenciatarios, y están protegidos por la legislación vigente en materia de propiedad intelectual e industrial.'
                : 'All website content (texts, images, logos, source code, graphic design, database, etc.) is the exclusive property of TodoDJS or its legitimate licensors, and is protected by applicable intellectual and industrial property law.'}
            </p>
            <p className="mt-2">
              {isEs
                ? 'Queda expresamente prohibida la reproducción total o parcial, distribución, comunicación pública, transformación o cualquier otro acto de explotación de dichos contenidos sin autorización expresa y por escrito de TodoDJS, salvo para uso personal y no comercial.'
                : 'Any total or partial reproduction, distribution, public communication, transformation or any other exploitation of such content without the express written authorisation of TodoDJS is strictly prohibited, except for personal non-commercial use.'}
            </p>
            <p className="mt-2">
              {isEs
                ? 'En cuanto al contenido musical disponible en la plataforma, TodoDJS actúa como distribuidor autorizado o bajo los acuerdos de licencia correspondientes. El usuario se obliga a respetar dichos derechos y a no redistribuir, compartir ni explotar comercialmente las obras musicales accedidas a través del servicio.'
                : 'Regarding the musical content available on the platform, TodoDJS acts as an authorised distributor or under the corresponding licence agreements. Users must respect these rights and must not redistribute, share or commercially exploit any musical works accessed through the service.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '4. Condiciones de Acceso y Uso' : '4. Access and Use Conditions'}</h2>
            <p>
              {isEs
                ? 'El acceso a determinadas funcionalidades de TodoDJS requiere la creación de una cuenta de usuario y la contratación de un plan de suscripción de pago. El usuario se compromete a:'
                : 'Access to certain TodoDJS features requires creating a user account and subscribing to a paid plan. The user agrees to:'}
            </p>
            <ul className="mt-3 space-y-1 pl-4 list-disc list-inside">
              {isEs ? (
                <>
                  <li>Facilitar datos verídicos, actualizados y completos en el proceso de registro.</li>
                  <li>Mantener la confidencialidad de sus credenciales de acceso.</li>
                  <li>No ceder su cuenta a terceros ni permitir su uso simultáneo en más dispositivos de los permitidos por su plan.</li>
                  <li>No utilizar los recursos musicales para fines distintos a los autorizados por la suscripción contratada.</li>
                  <li>No realizar ninguna actividad que pueda dañar, sobrecargar o inutilizar los sistemas de TodoDJS.</li>
                </>
              ) : (
                <>
                  <li>Provide truthful, up-to-date and complete data during registration.</li>
                  <li>Keep their access credentials confidential.</li>
                  <li>Not share their account with third parties or allow simultaneous use on more devices than permitted by their plan.</li>
                  <li>Not use musical resources for purposes other than those authorised by the contracted subscription.</li>
                  <li>Not carry out any activity that may damage, overload or disable TodoDJS systems.</li>
                </>
              )}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '5. Exclusión de Responsabilidad' : '5. Disclaimer of Liability'}</h2>
            <p>
              {isEs
                ? 'TodoDJS no se hace responsable de los daños o perjuicios que puedan derivarse del uso incorrecto del sitio web o de la imposibilidad de acceso al mismo por causas ajenas a su voluntad, tales como fallos en las redes de comunicación, interrupciones en el suministro eléctrico, ataques informáticos u otras circunstancias de fuerza mayor.'
                : 'TodoDJS is not liable for any damages arising from improper use of the website or inability to access it due to causes beyond its control, such as communication network failures, power outages, cyberattacks or other force majeure circumstances.'}
            </p>
            <p className="mt-2">
              {isEs
                ? 'Asimismo, TodoDJS no garantiza la ausencia de virus u otros elementos en los contenidos que puedan producir alteraciones en los sistemas informáticos de los usuarios.'
                : 'TodoDJS does not guarantee that the content is free from viruses or other elements that could cause damage to users\' computer systems.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '6. Legislación Aplicable y Jurisdicción' : '6. Applicable Law and Jurisdiction'}</h2>
            <p>
              {isEs
                ? 'Las presentes condiciones se rigen e interpretan conforme a la legislación española. Para la resolución de cualquier controversia que pudiera surgir en relación con el acceso o uso del sitio web, las partes se someten expresamente a los Juzgados y Tribunales de España, con renuncia a cualquier otro fuero que pudiera corresponderles.'
                : 'These conditions are governed by and construed in accordance with Spanish law. For the resolution of any dispute arising from access to or use of the website, the parties expressly submit to the Courts and Tribunals of Spain, waiving any other jurisdiction that may apply.'}
            </p>
            <p className="mt-2">
              {isEs ? 'Normativa de referencia aplicable:' : 'Applicable reference legislation:'}
            </p>
            <ul className="mt-2 space-y-1 pl-4 list-disc list-inside">
              <li>Ley 34/2002, de 11 de julio, LSSICE</li>
              <li>Real Decreto Legislativo 1/1996, de 12 de abril, Ley de Propiedad Intelectual</li>
              <li>Reglamento (UE) 2016/679 (RGPD)</li>
              <li>Ley Orgánica 3/2018, de 5 de diciembre, LOPDGDD</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{isEs ? '7. Modificaciones' : '7. Amendments'}</h2>
            <p>
              {isEs
                ? 'TodoDJS se reserva el derecho de modificar el presente Aviso Legal en cualquier momento. Las modificaciones entrarán en vigor desde el momento de su publicación en el sitio web. Se recomienda al usuario revisar periódicamente este documento.'
                : 'TodoDJS reserves the right to amend this Legal Notice at any time. Amendments take effect upon publication on the website. Users are advised to review this document periodically.'}
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
