export type Role = "admin" | "mentor" | "student";

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  status: string;
  avatar?: string | null;
}
