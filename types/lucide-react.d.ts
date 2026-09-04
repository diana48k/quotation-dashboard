declare module "lucide-react" {
  import type { ComponentType, SVGProps } from "react";

  export type LucideProps = SVGProps<SVGSVGElement> & {
    size?: number | string;
    strokeWidth?: number | string;
    absoluteStrokeWidth?: boolean;
  };

  export type LucideIcon = ComponentType<LucideProps>;

  export const AlertTriangle: LucideIcon;
  export const ArrowDownRight: LucideIcon;
  export const ArrowDown: LucideIcon;
  export const ArrowUp: LucideIcon;
  export const ArrowUpRight: LucideIcon;
  export const BarChart3: LucideIcon;
  export const Bell: LucideIcon;
  export const BriefcaseBusiness: LucideIcon;
  export const Building2: LucideIcon;
  export const CalendarDays: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const CircleDollarSign: LucideIcon;
  export const Clock3: LucideIcon;
  export const Database: LucideIcon;
  export const Download: LucideIcon;
  export const ExternalLink: LucideIcon;
  export const Eye: LucideIcon;
  export const FileDown: LucideIcon;
  export const FileText: LucideIcon;
  export const FileSpreadsheet: LucideIcon;
  export const Filter: LucideIcon;
  export const LineChart: LucideIcon;
  export const Loader2: LucideIcon;
  export const Menu: LucideIcon;
  export const MoreVertical: LucideIcon;
  export const PanelLeftClose: LucideIcon;
  export const PanelLeftOpen: LucideIcon;
  export const Printer: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const Search: LucideIcon;
  export const ShieldAlert: LucideIcon;
  export const SlidersHorizontal: LucideIcon;
  export const Table2: LucideIcon;
  export const XCircle: LucideIcon;
  export const X: LucideIcon;
}
