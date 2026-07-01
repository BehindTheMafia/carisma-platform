import { ClipboardList, CheckCircle2, Receipt, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "proforma", label: "Proforma", icon: ClipboardList },
  { id: "confirmacion", label: "Confirmación", icon: CheckCircle2 },
  { id: "factura", label: "Factura", icon: Receipt },
  { id: "contrato", label: "Contrato", icon: FileText },
];

export function DocumentTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (id: string) => void;
}) {
  return (
    <div className="bg-card p-1.5 rounded-xl border border-border flex flex-wrap sm:flex-nowrap gap-1.5">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2",
              isActive
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="size-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
