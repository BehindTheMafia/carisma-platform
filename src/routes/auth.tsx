import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import loginLogo from "@/assets/tm-rent-login-transparent.png";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión — TM RENT A CAR" },
      { name: "description", content: "Acceso al sistema de administración de TM RENT A CAR." },
    ],
  }),
  ssr: false,
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
const signupSchema = loginSchema.extend({
  nombre: z.string().trim().min(2, "Nombre requerido").max(80),
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    try {
      if (mode === "login") {
        const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        toast.success("Bienvenido");
        navigate({ to: "/dashboard", replace: true });
      } else {
        const parsed = signupSchema.safeParse({
          email: form.get("email"),
          password: form.get("password"),
          nombre: form.get("nombre"),
        });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { nombre: parsed.data.nombre },
          },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Iniciando sesión...");
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Lado branding */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#101820] px-12 py-10 text-white lg:flex xl:px-16">
        <div className="absolute inset-0 bg-gradient-to-br from-[#172638] via-[#101820] to-[#171611]" />
        <div className="relative flex flex-1 items-center justify-center">
          <img
            src={loginLogo}
            alt="TM Rent a Car — Donde empieza tu mejor ruta"
            className="w-full max-w-[560px] object-contain"
          />
        </div>
        <div className="relative max-w-md space-y-3 pb-6">
          <div className="h-px w-12 bg-[#c7a264]" />
          <h1 className="text-3xl font-bold tracking-tight xl:text-4xl">
            Administración integral
            <br />
            <span className="text-[#c7a264]">de tu flota.</span>
          </h1>
          <p className="text-sm leading-relaxed text-white/60 xl:text-base">
            Controla vehículos, rentas, clientes, pagos y mantenimientos desde un único panel profesional.
          </p>
        </div>
        <div className="relative text-xs text-white/35">
          © {new Date().getFullYear()} TM RENT A CAR. Todos los derechos reservados.
        </div>
      </div>

      {/* Lado formulario */}
      <div className="flex items-center justify-center bg-[#101820] px-5 py-8 lg:bg-background lg:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center lg:hidden">
            <img
              src={loginLogo}
              alt="TM Rent a Car — Donde empieza tu mejor ruta"
              className="w-72 max-w-full object-contain sm:w-80"
            />
          </div>
          <Card className="border-border shadow-[var(--shadow-elevated)]">
            <CardHeader>
              <CardTitle className="text-2xl">Acceso al sistema</CardTitle>
              <CardDescription>Ingresa con tu cuenta de administrador.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "signup")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
                  <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                  <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo</Label>
                      <Input id="email" name="email" type="email" autoComplete="email" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Contraseña</Label>
                      <Input id="password" name="password" type="password" autoComplete="current-password" required />
                    </div>
                    <Button type="submit" className="w-full bg-[#bb9255] font-semibold text-[#151719] hover:bg-[#cba76b]" disabled={loading}>
                      {loading ? <Loader2 className="size-4 animate-spin" /> : "Iniciar sesión"}
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup">
                  <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre completo</Label>
                      <Input id="nombre" name="nombre" type="text" autoComplete="name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email2">Correo</Label>
                      <Input id="email2" name="email" type="email" autoComplete="email" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password2">Contraseña</Label>
                      <Input id="password2" name="password" type="password" autoComplete="new-password" minLength={6} required />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      El primer usuario registrado obtendrá el rol de <strong>Owner</strong>.
                    </p>
                    <Button type="submit" className="w-full bg-[#bb9255] font-semibold text-[#151719] hover:bg-[#cba76b]" disabled={loading}>
                      {loading ? <Loader2 className="size-4 animate-spin" /> : "Crear cuenta"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          <p className="text-center text-xs text-white/55 lg:text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Volver al inicio</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
