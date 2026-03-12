import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

export default function Cards({
  title,
  children,
  actions,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`group relative ${className}`}>
      {/* Gradient border glow on hover */}
      <div className="absolute -inset-px bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 rounded-2xl opacity-0 group-hover:opacity-100 blur transition-all duration-500"></div>
      
      {/* Main card */}
      <Card className="relative border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl group-hover:border-white/20 transition-all duration-300">
        {title && (
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-white/5">
            <CardTitle className="text-2xl font-bold tracking-tight">
              {title}
            </CardTitle>
            {actions && <div className="flex gap-2">{actions}</div>}
          </CardHeader>
        )}
        <CardContent className={title ? "pt-6" : "p-6"}>
          {children}
        </CardContent>
      </Card>
    </section>
  );
}