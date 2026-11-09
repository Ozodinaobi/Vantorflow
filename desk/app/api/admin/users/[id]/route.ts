import {NextResponse} from "next/server";
import {adminApi} from "@/lib/auth";
import {authAdmin,rest} from "@/lib/db";
export const dynamic="force-dynamic";
export async function GET(req:Request,{params}:{params:{id:string}}){
 const denied=await adminApi(req);if(denied)return denied;
 if(!/^[0-9a-f-]{36}$/i.test(params.id))return NextResponse.json({error:"Invalid account id"},{status:400});
 try{
  const [auth,controls,usage,activity,opportunities,rfqs,flags]=await Promise.all([
   authAdmin(`/admin/users/${encodeURIComponent(params.id)}`,"GET"),
   rest<any[]>("GET","user_controls",`?user_id=eq.${params.id}&select=*&limit=1`),
   rest<any[]>("GET","ai_usage_events",`?user_id=eq.${params.id}&select=*&order=created_at.desc&limit=100`),
   rest<any[]>("GET","activity_log",`?user_id=eq.${params.id}&select=*&order=created_at.desc&limit=100`),
   rest<any[]>("GET","opportunities",`?user_id=eq.${params.id}&select=id,title,buyer:buyer_organization,status,deadline:deadline_date,value:estimated_value,created_at,updated_at&order=created_at.desc&limit=100`),
   rest<any[]>("GET","rfqs",`?user_id=eq.${params.id}&select=id,title,buyer:buyer_organization,status,deadline:deadline_date,created_at,updated_at&order=created_at.desc&limit=100`),
   rest<any[]>("GET","abuse_flags",`?user_id=eq.${params.id}&select=*&order=created_at.desc&limit=100`)
  ]);
  return NextResponse.json({user:auth.user||auth,rfqs,opportunities,control:controls[0]||{status:(auth.user||auth).banned_until?"suspended":"active",ai_monthly_cap:100},usage,usage_total:usage.length,activity,flags,partial:{usage:usage.length===100,activity:activity.length===100,opportunities:opportunities.length===100,rfqs:rfqs.length===100,flags:flags.length===100}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Could not load account"},{status:503})}
}
