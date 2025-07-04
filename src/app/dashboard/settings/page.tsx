import { PageTitle } from '@/components/shared/PageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Globe, Bell, ShieldCheck } from 'lucide-react'; // Changed ShieldLock to ShieldCheck

export default function SettingsPage() {
  return (
    <div>
      <PageTitle title="Configuración de Cuenta" subtitle="Gestiona tus preferencias y la seguridad de tu cuenta." />

      <div className="space-y-8">
        <Card className="shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center"><Bell className="mr-2 h-5 w-5 text-primary"/> Configuración de Notificaciones</CardTitle>
            <CardDescription>Controla cómo recibes notificaciones de Hestia.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors">
              <Label htmlFor="emailNotifications" className="flex flex-col space-y-1">
                <span>Notificaciones por Correo</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Recibe actualizaciones sobre tus pólizas, pagos y anuncios importantes por correo.
                </span>
              </Label>
              <Switch id="emailNotifications" defaultChecked aria-label="Activar notificaciones por correo"/>
            </div>
            <div className="flex items-center justify-between space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors">
              <Label htmlFor="smsNotifications" className="flex flex-col space-y-1">
                <span>Alertas por SMS</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Recibe alertas críticas y recordatorios por mensaje de texto (pueden aplicarse tarifas del operador).
                </span>
              </Label>
              <Switch id="smsNotifications" aria-label="Activar alertas por SMS"/>
            </div>
             <div className="flex items-center justify-between space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors">
              <Label htmlFor="newsletter" className="flex flex-col space-y-1">
                <span>Actualizaciones Promocionales</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Suscríbete a nuestro boletín para recibir actualizaciones de productos y ofertas especiales.
                </span>
              </Label>
              <Switch id="newsletter" defaultChecked aria-label="Activar actualizaciones promocionales"/>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center"><ShieldCheck className="mr-2 h-5 w-5 text-primary"/> Configuración de Seguridad</CardTitle>
            <CardDescription>Gestiona las funciones de seguridad de tu cuenta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center justify-between space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors">
              <div className="flex flex-col space-y-1">
                <span>Autenticación de Dos Factores (2FA)</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Mejora la seguridad de tu cuenta requiriendo una segunda forma de verificación.
                </span>
              </div>
              <Button variant="outline">Habilitar 2FA</Button>
            </div>
             <div className="flex items-center justify-between space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors">
              <div className="flex flex-col space-y-1">
                <span>Historial de Inicio de Sesión</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Revisa la actividad reciente de inicio de sesión en tu cuenta.
                </span>
              </div>
              <Button variant="link">Ver Historial</Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center"><Globe className="mr-2 h-5 w-5 text-primary"/> Idioma y Región</CardTitle>
            <CardDescription>Elige tu idioma y configuración regional preferidos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-2 p-3 border rounded-md">
              <Label htmlFor="language" className="font-normal">Idioma</Label>
              {/* This would be a Select component in a real app */}
              <Button variant="outline">Español (MX)</Button> 
            </div>
             <div className="flex items-center justify-between space-x-2 p-3 border rounded-md">
              <Label htmlFor="timezone" className="font-normal">Zona Horaria</Label>
              <Button variant="outline">(GMT-06:00) Hora Central</Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-right">
            <Button className="bg-primary hover:bg-primary/90 text-lg px-6 py-5">Guardar Toda la Configuración</Button>
        </div>
      </div>
    </div>
  );
}
