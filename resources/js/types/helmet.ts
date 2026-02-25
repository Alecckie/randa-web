export interface Helmet {
  id: number;
  helmet_code: string;
  qr_code: string;
  status: "available" | "assigned" | "maintenance" | "retired";
  current_branding?: string | null;
  created_at: string;
  updated_at: string;
  current_assignment?: {
    id: number;
    campaign?: {
      id: number;
      name: string;
    };
    rider: {
      id: number;
      user: {
        id: number;
        name: string;
        email: string;
        phone?: string;
      };
    };
  };
}

export interface Rider {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
}