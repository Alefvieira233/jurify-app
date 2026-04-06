
export interface AdminData {
  email: string;
  password: string;
  name: string;
  userId?: string;
}

export interface AdminCreationSteps {
  userCreated: boolean;
  profileCreated: boolean;
  roleAssigned: boolean;
  loginCompleted: boolean;
  redirecting: boolean;
}
