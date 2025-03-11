// types.d.ts or any file included in tsconfig.json
import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user?: {
      id: string; // Add the id property
      name?: string | null | undefined;
      email?: string | null | undefined;
      image?: string | null | undefined;
    } & DefaultSession["user"]; // Merge with default session user
  }

  interface User extends DefaultUser {
    id: string; // Add the id property to the User type
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string; // Add the id property to the JWT type
  }
}