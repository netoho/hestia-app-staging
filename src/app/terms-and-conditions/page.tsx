import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { PageTitle } from '@/components/shared/PageTitle';
import { Section } from '@/components/shared/Section';
import { Card, CardContent } from '@/components/ui/card';
import { SITE_NAME, COMPANY_LEGAL_NAME, CONTACT_EMAIL } from '@/lib/constants';

export default function TermsAndConditionsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-grow">
        <Section className="pt-24 pb-16">
          <PageTitle title="Términos y Condiciones" subtitle="Última actualización: 24 de junio de 2024" />
          <Card className="p-6 md:p-8 rounded-lg shadow-lg">
            <CardContent className="prose prose-lg max-w-none text-foreground">
              <p>Bienvenido a {SITE_NAME}. Estos términos y condiciones describen las reglas y regulaciones para el uso del sitio web de {COMPANY_LEGAL_NAME}, ubicado en [URL de su sitio web].</p>

              <p>Al acceder a este sitio web, asumimos que acepta estos términos y condiciones. No continúe usando {SITE_NAME} si no está de acuerdo con todos los términos y condiciones establecidos en esta página.</p>

              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">Cookies</h2>
              <p>Empleamos el uso de cookies. Al acceder a {SITE_NAME}, usted aceptó el uso de cookies de acuerdo con la Política de Privacidad de {COMPANY_LEGAL_NAME}.</p>
              
              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">Licencia</h2>
              <p>A menos que se indique lo contrario, {COMPANY_LEGAL_NAME} y/o sus licenciantes poseen los derechos de propiedad intelectual de todo el material en {SITE_NAME}. Todos los derechos de propiedad intelectual están reservados. Puede acceder a este material desde {SITE_NAME} para su uso personal sujeto a las restricciones establecidas en estos términos y condiciones.</p>
              <p>No debe:</p>
              <ul>
                <li>Volver a publicar material de {SITE_NAME}</li>
                <li>Vender, alquilar o sublicenciar material de {SITE_NAME}</li>
                <li>Reproducir, duplicar o copiar material de {SITE_NAME}</li>
                <li>Redistribuir contenido de {SITE_NAME}</li>
              </ul>

              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">Comentarios de los Usuarios</h2>
              <p>Este Acuerdo comenzará en la fecha del presente.</p>
              <p>Partes de este sitio web ofrecen una oportunidad para que los usuarios publiquen e intercambien opiniones e información en ciertas áreas del sitio web. {COMPANY_LEGAL_NAME} no filtra, edita, publica ni revisa los Comentarios antes de su presencia en el sitio web. Los Comentarios no reflejan los puntos de vista y opiniones de {COMPANY_LEGAL_NAME}, sus agentes y/o afiliados. Los Comentarios reflejan los puntos de vista y opiniones de la persona que publica sus puntos de vista y opiniones.</p>
              
              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">Descargo de Responsabilidad</h2>
              <p>En la medida máxima permitida por la ley aplicable, excluimos todas las representaciones, garantías y condiciones relacionadas con nuestro sitio web y el uso de este sitio web. Nada en este descargo de responsabilidad:</p>
              <ul>
                <li>limitará o excluirá nuestra o su responsabilidad por muerte o lesiones personales;</li>
                <li>limitará o excluirá nuestra o su responsabilidad por fraude o tergiversación fraudulenta;</li>
                <li>limitará cualquiera de nuestras o sus responsabilidades de cualquier manera que no esté permitida por la ley aplicable; o</li>
                <li>excluirá cualquiera de nuestras o sus responsabilidades que no puedan ser excluidas bajo la ley aplicable.</li>
              </ul>
              <p>Las limitaciones y prohibiciones de responsabilidad establecidas en esta Sección y en otras partes de este descargo de responsabilidad: (a) están sujetas al párrafo anterior; y (b) rigen todas las responsabilidades que surjan en virtud del descargo de responsabilidad, incluidas las responsabilidades que surjan en el contrato, en agravio y por incumplimiento del deber legal.</p>
              <p>Mientras el sitio web y la información y los servicios en el sitio web se proporcionen de forma gratuita, no seremos responsables de ninguna pérdida o daño de ninguna naturaleza.</p>
              
              <p className="mt-8"><strong>Información de Contacto</strong></p>
              <p>Si tiene alguna consulta sobre cualquiera de nuestros términos, contáctenos en {CONTACT_EMAIL}.</p>
            </CardContent>
          </Card>
        </Section>
      </main>
      <PublicFooter />
    </div>
  );
}
