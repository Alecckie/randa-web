export interface Helmet {
  id: number;
  helmet_code: string;
  qr_code: string;
  status: "available" | "assigned" | "maintenance" | "retired";
  current_branding?: string | null;
  created_at: string;
  updated_at: string;
}