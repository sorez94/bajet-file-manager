export type Role = "SUPER_ADMIN" | "USER";

export interface ClientFile {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploaderEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientUser {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  role: Role;
}
