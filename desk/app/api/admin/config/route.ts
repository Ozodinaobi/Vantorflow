import {NextResponse} from "next/server";
import {adminApi,adminFromRequest} from "@/lib/auth";
import {rest} from "@/lib/db";

const DEFAULTS={enabled:false,request_rate_per_minute:60,monthly_ai_cap_action:"flag",suspicious_pattern_action:"flag",auto_suspend:false};
export async function GET(req:Request){
 const denied=await adminApi(req);if(denied)return denied;
 try{const rows=await rest<any[]>("GET","admin_config","?config_key=eq.abuse_detection&select=*&limit=1");return NextResponse.json(rows[0]?.config?{...DEFAULTS,...rows[0].config,enabled:rows[0].enabled}:DEFAULTS)}
 catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Could not load safety rules"},{status:503})}
}
export async function PATCH(req:Request){
 const denied=await adminApi(req);if(denied)return denied;
 let body:any;try{body=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 const rate=body.request_rate_per_minute,capAction=body.monthly_ai_cap_action,pattern=body.suspicious_pattern_action;
 if(typeof body.enabled!=="boolean"||!Number.isInteger(rate)||rate<1||rate>10000||!['flag','limit'].includes(capAction)||!['flag','limit'].includes(pattern))return NextResponse.json({error:"Choose valid thresholds and flag or limit actions. Automatic suspension is not supported."},{status:400});
 const config={mode:body.enabled?"monitor":"disabled",request_rate_per_minute:rate,monthly_ai_cap_action:capAction,suspicious_pattern_action:pattern,auto_suspend:false};
 const actor=adminFromRequest();
 try{
  await rest("POST","admin_config","",{config_key:"abuse_detection",enabled:body.enabled,config,updated_by:actor?.uid},"resolution=merge-duplicates");
  await rest("POST","activity_log","",{actor_id:actor?.uid,action:"admin_safety_rules_updated",details:{...config,enabled:body.enabled}});
  return NextResponse.json({ok:true,...config,enabled:body.enabled});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Could not save policy"},{status:503})}
}
