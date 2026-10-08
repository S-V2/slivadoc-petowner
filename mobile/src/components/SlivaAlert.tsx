import { LocalizedPressable as Pressable } from "./LocalizedPressable";
import { useSyncExternalStore } from "react";
import { Modal,  ScrollView, StyleSheet, View, type AlertButton, type AlertOptions } from "react-native";
import { LocalizedText as Text, useI18n } from "../i18n";
import { colors } from "../theme";
type Request = {title:string;message?:string;buttons?:AlertButton[];options?:AlertOptions};
const queue: Request[]=[];
const listeners=new Set<()=>void>();
function emit(){for(const listener of listeners)listener();}
export const SlivaAlert={alert(title:string,message?:string,buttons?:AlertButton[],options?:AlertOptions){queue.push({title,message,buttons,options});emit();}};
export function SlivaAlertHost(){
  const {t}=useI18n();
  const request=useSyncExternalStore(listener=>{listeners.add(listener);return()=>{listeners.delete(listener);};},()=>queue[0],()=>undefined);
  if(!request)return null;
  const finish=(button?:AlertButton)=>{queue.shift();emit();try{const outcome=Promise.resolve(button?.onPress?.());void outcome.catch((error:unknown)=>SlivaAlert.alert(error instanceof Error?error.message:t("Coba lagi")));}catch(error){SlivaAlert.alert(error instanceof Error?error.message:t("Coba lagi"));}};
  const dismiss=()=>{if(request.options?.cancelable===false)return;finish(request.buttons?.find(button=>button.style==="cancel"));request.options?.onDismiss?.();};
  return <Modal supportedOrientations={["portrait", "portrait-upside-down", "landscape-left", "landscape-right"]} visible transparent animationType="fade" statusBarTranslucent onRequestClose={dismiss}><View style={styles.backdrop}><Pressable style={StyleSheet.absoluteFill} onPress={dismiss}/><View accessibilityViewIsModal style={styles.card}><ScrollView style={{flexShrink:1}}><Text style={styles.title}>{request.title}</Text>{request.message&&<Text style={styles.note}>{request.message}</Text>}<View style={styles.actions}>{(request.buttons?.length?request.buttons:[{text:t("OK")}]).map((button,index)=><Pressable key={index} accessibilityRole="button" onPress={()=>finish(button)} style={[styles.button,button.style==="destructive"&&styles.danger]}><Text style={button.style==="destructive"?styles.dangerText:styles.label}>{button.text||t("OK")}</Text></Pressable>)}</View></ScrollView></View></View></Modal>;
}
const styles=StyleSheet.create({backdrop:{flex:1,alignItems:"center",justifyContent:"center",padding:20,backgroundColor:"rgba(13,35,54,.42)"},card:{overflow:"hidden",width:"100%",maxWidth:460,maxHeight:"90%",padding:22,borderRadius:24,borderWidth:1,borderColor:colors.sky100,backgroundColor:colors.white},title:{fontSize:18,fontWeight:"600",color:colors.navy},note:{fontSize:13,lineHeight:20,color:colors.text,marginTop:12},actions:{flexDirection:"row",flexWrap:"wrap",gap:8,justifyContent:"flex-end",marginTop:20},button:{minHeight:44,padding:12,borderRadius:14,backgroundColor:colors.sky50},danger:{backgroundColor:colors.red},label:{color:colors.sky600,fontSize:13,fontWeight:"600"},dangerText:{color:colors.white,fontSize:13,fontWeight:"600"}});
