export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Profile extends User {
  updated_at: string;
}

// Re-export auth types from existing locations
export type { AuthError, AuthRepository } from '../../repositories/auth';
