// GET /api/setup/schema: returns the SQL the owner must paste once. Public, contains no secrets.
import { NextResponse } from "next/server";
import { SCHEMA_SQL } from "@/lib/schemaSql";

export async function GET() {
  return NextResponse.json({ sql: SCHEMA_SQL });
}
