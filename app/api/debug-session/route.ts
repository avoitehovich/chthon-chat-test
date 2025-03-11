import { getServerSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres"; // Assuming this is your SQL query function

interface User {
    id: number | string;
    email: string;
    name?: string;
  }
  
  export async function GET(request: Request) {
    const session = await getServerSession();
  
    let dbUsers: User[] = [];
    try {
      const result = await sql`SELECT * FROM users`;
      dbUsers = result.rows as User[]; // Type assertion
      return NextResponse.json({ dbUsers });
    } catch (error) {
      console.error("Error fetching users:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }