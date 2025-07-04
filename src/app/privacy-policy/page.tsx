import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { PageTitle } from '@/components/shared/PageTitle';
import { Section } from '@/components/shared/Section';
import { Card, CardContent } from '@/components/ui/card';

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-grow">
        <Section className="pt-24 pb-16">
          <PageTitle title="Aviso de Privacidad" subtitle="Última Actualización 02-03-2021" />
          <Card className="p-6 md:p-8 rounded-lg shadow-lg">
            <CardContent className="prose prose-lg max-w-none text-foreground">
              <p>
                Hestia Protección Legal y Patrimonial S.A.S de C.V., mejor conocido como HESTIA, con domicilio en calle 5 de Febrero 637, Torre 4, interior 6, colonia Álamos, código postal 03400, en Benito Juárez, Ciudad de México, con correo electrónico privacidad@hestiaplp.com.mx, es el responsable del uso y protección de sus datos personales, y al respecto le informamos lo siguiente:
              </p>

              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">¿Para qué fines utilizaremos sus datos personales?</h2>
              <p>
                Los datos personales que recabamos de usted, los utilizaremos para las siguientes finalidades que son necesarias para el servicio que solicita:
              </p>
              <ul>
                <li>Elaborar el contrato de prestación de servicios jurídicos a futuro, con el beneficiario de la protección jurídica de arrendamiento.</li>
                <li>Para la elaboración de los contratos de arrendamiento y documentación pertinente y relativa, para dicho fin, para el beneficiario de la protección jurídica de arrendamiento, arrendatario y obligado solidario quienes participan en dicho contrato</li>
                <li>Para realizar las investigaciones pertinentes a fin de garantizar el cumplimiento de las obligaciones derivadas de un contrato de arrendamiento.</li>
              </ul>

              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">¿Qué datos personales utilizaremos para estos fines?</h2>
              <p>
                Para llevar a cabo las finalidades descritas en el presente aviso de privacidad, utilizaremos los siguientes datos personales:
              </p>
              <ul>
                <li>Nombre</li>
                <li>Estado Civil</li>
                <li>Registro Federal de Contribuyentes(RFC)</li>
                <li>Clave única de Registro de Población (CURP)</li>
                <li>Lugar de nacimiento</li>
                <li>Fecha de nacimiento</li>
                <li>Nacionalidad</li>
                <li>Domicilio</li>
                <li>Teléfono particular</li>
                <li>Teléfono celular</li>
                <li>Correo electrónico</li>
                <li>Firma autógrafa</li>
                <li>Puesto o cargo que desempeña</li>
                <li>Domicilio de trabajo</li>
                <li>Correo electrónico institucional</li>
                <li>Teléfono institucional</li>
                <li>Referencias laborales</li>
                <li>Calidad migratoria</li>
                <li>Bienes muebles</li>
                <li>Información fiscal</li>
                <li>Historial crediticio</li>
                <li>Ingresos</li>
                <li>Egresos</li>
                <li>Cuentas bancarias</li>
              </ul>

              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">¿Con quién compartimos su información personal y para qué fines?</h2>
              <p>
                Le informamos que sus datos personales son compartidos dentro del país con las siguientes personas, empresas, organizaciones o autoridades distintas a nosotros, para los siguientes fines:
              </p>
              
              <div className="overflow-x-auto my-6">
                <table className="min-w-full">
                    <thead>
                        <tr>
                            <th className="text-left p-2 border">Destinatario de los datos personales</th>
                            <th className="text-left p-2 border">Finalidad</th>
                            <th className="text-left p-2 border">Requiere del consentimiento</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="p-2 border">Las entidades de información crediticia.</td>
                            <td className="p-2 border">Obtener reportes de comportamiento crediticio.</td>
                            <td className="p-2 border">Sí</td>
                        </tr>
                        <tr>
                            <td className="p-2 border">Las entidades de información judicial pública.</td>
                            <td className="p-2 border">Solicitar información acerca de juicios o controversias judiciales.</td>
                            <td className="p-2 border">No</td>
                        </tr>
                        <tr>
                            <td className="p-2 border">Las autoridades judiciales de la entidad en que se haya celebrado un contrato de arrendamiento o a las que hubieran sometido la resolución de disputas derivadas del cumplimento de las obligaciones de dicho contrato.</td>
                            <td className="p-2 border">Llevar procedimientos judiciales a efecto de hacer cumplir las obligaciones derivadas de los contratos de arrendamiento.</td>
                            <td className="p-2 border">No</td>
                        </tr>
                    </tbody>
                </table>
              </div>

              <p>
                Con relación a las transferencias que requieren de su consentimiento, por favor indique a continuación si nos lo otorga: Otorgo mi consentimiento para las siguientes transferencias de mis datos personales:
              </p>
              
              <div className="overflow-x-auto my-6">
                 <table className="min-w-full">
                    <thead>
                        <tr>
                            <th className="text-left p-2 border">Destinatario de los datos personales</th>
                            <th className="text-left p-2 border">Finalidad</th>
                            <th className="text-left p-2 border">Selecciona</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="p-2 border">Las entidades de información crediticia.</td>
                            <td className="p-2 border">Obtener reportes de comportamiento crediticio.</td>
                            <td className="p-2 border">Si ( ) No ( )</td>
                        </tr>
                    </tbody>
                </table>
              </div>
            
              <p>Nombre y firma del titular: ________________________________________</p>

              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">¿Cómo puede acceder, rectificar o cancelar sus datos personales, u oponerse a su uso?</h2>
              <p>
                Usted tiene derecho a conocer qué datos personales tenemos de usted, para qué los utilizamos y las condiciones del uso que les damos (Acceso). Asimismo, es su derecho solicitar la corrección de su información personal en caso de que esté desactualizada, sea inexacta o incompleta (Rectificación); que la eliminemos de nuestros registros o bases de datos cuando considere que la misma no está siendo utilizada adecuadamente (Cancelación); así como oponerse al uso de sus datos personales para fines específicos (Oposición). Estos derechos se conocen como derechos ARCO. Para el ejercicio de cualquiera de los derechos ARCO, usted deberá presentar la solicitud respectiva a través del correo electrónico privacidad@hestiaplp.com.mx.
              </p>
              <p>
                Para conocer el procedimiento y requisitos para el ejercicio de los derechos ARCO, ponemos a su disposición la información pertinente en la página de internet https://www.hestiaplp.com.mx.
              </p>
              <p>
                Los datos de contacto de la persona o departamento de datos personales, que está a cargo de dar trámite a las solicitudes de derechos ARCO, son los siguientes:
              </p>
              <ul>
                <li>a) Nombre de la persona o departamento de datos personales: Gerardo Evaristo Sánchez Pérez.</li>
                <li>b) Domicilio: calle 5 de Febrero, colonia Álamos, código postal 03400, en Benito Juárez, Ciudad de México.</li>
                <li>c) Correo electrónico: privacidad@hestiaplp.com.mx.</li>
                <li>d) Número telefónico: 5539482094.</li>
              </ul>
              
              <h3 className="font-headline text-xl mt-4 mb-2 text-primary/90">Usted puede revocar su consentimiento para el uso de sus datos personales</h3>
              <p>
                Usted puede revocar el consentimiento que, en su caso, nos haya otorgado para el tratamiento de sus datos personales. Sin embargo, es importante que tenga en cuenta que no en todos los casos podremos atender su solicitud o concluir el uso de forma inmediata, ya que es posible que por alguna obligación legal requiramos seguir tratando sus datos personales. Asimismo, usted deberá considerar que para ciertos fines, la revocación de su consentimiento implicará que no le podamos seguir prestando el servicio que nos solicitó, o la conclusión de su relación con nosotros.
              </p>
              <p>
                Para revocar su consentimiento deberá presentar su solicitud a través del correo electrónico privacidad@hestiaplp.com.mx
              </p>

              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">¿Cómo puede limitar el uso o divulgación de su información personal?</h2>
              <p>
                Con objeto de que usted pueda limitar el uso y divulgación de su información personal, le ofrecemos los siguientes medios: El titular podrá limitar el uso de sus datos personales enviando un correo a privacidad@hestiaplp.com.mx.
              </p>

              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">¿Cómo puede conocer los cambios en este aviso de privacidad?</h2>
              <p>
                El presente aviso de privacidad puede sufrir modificaciones, cambios o actualizaciones derivadas de nuevos requerimientos legales; de nuestras propias necesidades por los productos o servicios que ofrecemos; de nuestras prácticas de privacidad; de cambios en nuestro modelo de negocio, o por otras causas.
              </p>
              <p>
                Nos comprometemos a mantenerlo informado sobre los cambios que pueda sufrir el presente aviso de privacidad, a través de nuestro portal de internet, https://www.hestiaplp.com.mx.
              </p>
              <p>
                El procedimiento a través del cual se llevarán a cabo las notificaciones sobre cambios o actualizaciones al presente aviso de privacidad, será a través del correo electrónico que tenemos registrado.
              </p>
              
              <h3 className="font-headline text-xl mt-4 mb-2 text-primary/90">Su consentimiento para el tratamiento de sus datos personales</h3>
              <p>Consiento que mis datos personales sean tratados de conformidad con los términos y condiciones informados en el presente aviso de privacidad. [ ]</p>

              <p>Nombre y firma del titular: ________________________________________</p>
              <p className="mt-8 text-sm">Última Actualización 02-03-2021</p>
            </CardContent>
          </Card>
        </Section>
      </main>
      <PublicFooter />
    </div>
  );
}
