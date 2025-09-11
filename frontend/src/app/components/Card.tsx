import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

export default function Cards({
  title,
  children,
  actions,
}: {
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="bg-white border rounded-2xl shadow-sm">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {actions}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </section>
  );
}
