import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { PageTitle } from '@/components/shared/PageTitle';
import { Section } from '@/components/shared/Section';
import { Card, CardContent } from '@/components/ui/card';
import { SITE_NAME, COMPANY_LEGAL_NAME, CONTACT_EMAIL } from '@/lib/constants';

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-grow">
        <Section className="pt-24 pb-16">
          <PageTitle title="Política de Privacidad" subtitle="Última actualización: 24 de junio de 2024" />
          <Card className="p-6 md:p-8 rounded-lg shadow-lg">
            <CardContent className="prose prose-lg max-w-none text-foreground">
              <p>{COMPANY_LEGAL_NAME} ("nosotros", "nuestro") opera el sitio web {SITE_NAME} (el "Servicio").</p>
              <p>Esta página le informa de nuestras políticas sobre la recopilación, uso y divulgación de datos personales cuando utiliza nuestro Servicio y las opciones que tiene asociadas a esos datos.</p>
              <p>Utilizamos sus datos para proporcionar y mejorar el Servicio. Al utilizar el Servicio, usted acepta la recopilación y el uso de información de acuerdo con esta política.</p>

              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">Recopilación y Uso de Información</h2>
              <p>Recopilamos varios tipos diferentes de información para diversos fines para proporcionar y mejorar nuestro Servicio para usted.</p>
              <h3 className="font-headline text-xl mt-4 mb-2 text-primary/90">Tipos de Datos Recopilados</h3>
              <h4>Datos Personales</h4>
              <p>Mientras utiliza nuestro Servicio, podemos pedirle que nos proporcione cierta información de identificación personal que se puede utilizar para contactarlo o identificarlo ("Datos Personales"). La información de identificación personal puede incluir, entre otros:</p>
              <ul>
                <li>Dirección de correo electrónico</li>
                <li>Nombre y apellido</li>
                <li>Número de teléfono</li>
                <li>Dirección, Estado, Provincia, Código Postal, Ciudad</li>
                <li>Cookies y Datos de Uso</li>
              </ul>
              <h4>Datos de Uso</h4>
              <p>También podemos recopilar información sobre cómo se accede y utiliza el Servicio ("Datos de Uso"). Estos Datos de Uso pueden incluir información como la dirección de Protocolo de Internet de su computadora (por ejemplo, dirección IP), tipo de navegador, versión del navegador, las páginas de nuestro Servicio que visita, la hora y fecha de su visita, el tiempo que pasó en esas páginas, identificadores únicos de dispositivos y otros datos de diagnóstico.</p>

              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">Uso de los Datos</h2>
              <p>{COMPANY_LEGAL_NAME} utiliza los datos recopilados para diversos fines:</p>
              <ul>
                <li>Para proporcionar y mantener el Servicio</li>
                <li>Para notificarle sobre cambios en nuestro Servicio</li>
                <li>Para permitirle participar en funciones interactivas de nuestro Servicio cuando decida hacerlo</li>
                <li>Para proporcionar atención y soporte al cliente</li>
                <li>Para proporcionar análisis o información valiosa para que podamos mejorar el Servicio</li>
                <li>Para monitorear el uso del Servicio</li>
                <li>Para detectar, prevenir y abordar problemas técnicos</li>
              </ul>

              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">Seguridad de los Datos</h2>
              <p>La seguridad de sus datos es importante para nosotros, pero recuerde que ningún método de transmisión por Internet o método de almacenamiento electrónico es 100% seguro. Si bien nos esforzamos por utilizar medios comercialmente aceptables para proteger sus Datos Personales, no podemos garantizar su seguridad absoluta.</p>

              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">Cambios a esta Política de Privacidad</h2>
              <p>Podemos actualizar nuestra Política de Privacidad de vez en cuando. Le notificaremos cualquier cambio publicando la nueva Política de Privacidad en esta página.</p>
              <p>Se lo haremos saber por correo electrónico y/o un aviso destacado en nuestro Servicio, antes de que el cambio entre en vigencia y actualizaremos la "fecha de vigencia" en la parte superior de esta Política de Privacidad.</p>
              <p>Se le recomienda que revise esta Política de Privacidad periódicamente para detectar cualquier cambio. Los cambios a esta Política de Privacidad son efectivos cuando se publican en esta página.</p>

              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">Contáctenos</h2>
              <p>Si tiene alguna pregunta sobre esta Política de Privacidad, contáctenos:</p>
              <ul>
                <li>Por correo electrónico: {CONTACT_EMAIL}</li>
              </ul>
            </CardContent>
          </Card>
        </Section>
      </main>
      <PublicFooter />
    </div>
  );
}
