export interface Zone {
  id: number;
  name: string;
  description?: string | null;
  boundaries: Record<string, any>; // JSON field
  is_active: boolean;
  created_at: string;
  updated_at: string;
}