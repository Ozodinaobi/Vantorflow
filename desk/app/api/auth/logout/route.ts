import {NextResponse} from "next/server";import {clearCookie} from "@/lib/auth";export async function POST(){return clearCookie(NextResponse.json({ok:true}))}
