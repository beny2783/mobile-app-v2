export interface User {
  id: string;
  email: string;
  user_metadata?: {
    avatar_url?: string;
    full_name?: string;
  };
  created_at: string;
}

export interface Profile extends User {
  updated_at: string;
}
