import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
const ADMIN_EMAIL=(process.env.ADMIN_EMAIL||"admin@vantorflow.com.ng").trim().toLowerCase();
const COOKIE="vf_desk_session";const TTL=60*60*8;
function secret(){const s=process.env.ADMIN_SESSION_SECRET;if(!s||s.length<32)throw new Error("ADMIN_SESSION_SECRET must be at least 32 characters.");return s}
function mac(payload:string){return createHmac("sha256",secret()).update(payload).digest("base64url")}
export function issueSession(uid:string,email:string){const payload=Buffer.from(JSON.stringify({uid,email:email.toLowerCase(),exp:Math.floor(Date.now()/1000)+TTL})).toString("base64url");return `${payload}.${mac(payload)}`}
export function validSession(token?:string){if(!token)return null;const [payload,sig,extra]=token.split(".");if(!payload||!sig||extra)return null;try{const expected=Buffer.from(mac(payload)),got=Buffer.from(sig);if(expected.length!==got.length||!timingSafeEqual(expected,got))return null;const d=JSON.parse(Buffer.from(payload,"base64url").toString());if(d.email!==ADMIN_EMAIL||!d.uid||d.exp*1000<Date.now())return null;return {uid:d.uid,email:d.email}}catch{return null}}
export function adminFromRequest(){return validSession(cookies().get(COOKIE)?.value)}
export function sessionCookie(res:NextResponse,token:string){res.cookies.set(COOKIE,token,{httpOnly:true,sameSite:"strict",secure:process.env.NODE_ENV==="production",path:"/",maxAge:TTL});return res}
export function clearCookie(res:NextResponse){res.cookies.set(COOKIE,"",{httpOnly:true,sameSite:"strict",secure:process.env.NODE_ENV==="production",path:"/",maxAge:0});return res}
export async function adminApi(req:Request){if(!adminFromRequest())return NextResponse.json({error:"Admin session required"},{status:401});if(["POST","PATCH","PUT","DELETE"].includes(req.method)&&req.headers.get("origin")&&req.headers.get("origin")!==new URL(req.url).origin)return NextResponse.json({error:"Invalid request origin"},{status:403});return null}
