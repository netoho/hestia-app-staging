import { redirect } from 'next/navigation';


export default function RegisterPage() {
  redirect('/login');
  // return (
    {/* <AuthCard */}
    {/*   title={t.pages.register.title} */}
    {/*   description={t.pages.register.description} */}
    {/*   footerContent={ */}
    {/*     <> */}
    {/*       {t.pages.register.hasAccount}{' '} */}
    {/*       <Link href="/login" className="font-medium text-primary hover:underline"> */}
    {/*         {t.pages.register.loginLink} */}
    {/*       </Link> */}
    {/*     </> */}
    {/*   } */}
    {/* > */}
    {/*   <RegisterForm /> */}
    {/* </AuthCard> */}
  // );
}
