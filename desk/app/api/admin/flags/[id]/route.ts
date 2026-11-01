import {NextResponse} from "next/server";
import {adminApi,adminFromRequest} from "@/lib/auth";
import {rest} from "@/lib/db";
export async function PATCH(req:Request,{params}:{params:{id:string}}){
 const denied=await adminApi(req);if(denied)return denied;
 if(!/^[0-9a-f-]{36}$/i.test(params.id))return NextResponse.json({error:"Invalid flag id"},{status:400});
 let body:any;try{body=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 if(!["reviewing","resolved","false_positive"].includes(body.status))return NextResponse.json({error:"Choose a valid review status"},{status:400});
 try{
  const flags=await rest<any[]>("PATCH","abuse_flags",`?id=eq.${params.id}&select=id,user_id,status,rule_key`,{status:body.status,...(body.status==="reviewing"?{}:{resolved_at:new Date().toISOString()}),action_taken:typeof body.note==="string"?body.note.slice(0,500):null},"return=representation");
  if(!flags[0])return NextResponse.json({error:"Flag was not found"},{status:404});
  const actor=adminFromRequest();
  await rest("POST","activity_log","",{user_id:flags[0].user_id,actor_id:actor?.uid,action:"admin_flag_"+body.status,details:{flag_id:params.id,rule_key:flags[0].rule_key,note:typeof body.note==="string"?body.note.slice(0,500):null}});
  return NextResponse.json({ok:true,flag:flags[0]});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Could not update flag"},{status:503})}
}
