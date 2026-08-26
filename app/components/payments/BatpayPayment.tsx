"use client";

import { useEffect, useRef, useState } from "react";
import { getPaymentIntent, getPaymentMethods, type PaymentIntent, type PaymentMethod } from "../../lib/platform-api";

export function PaymentMethodPicker({value,onChange,disabled=false}:{value:string;onChange:(value:string)=>void;disabled?:boolean}) {
  const [methods,setMethods]=useState<PaymentMethod[]>([]);
  const [message,setMessage]=useState("");
  useEffect(()=>{let active=true;void getPaymentMethods().then(result=>{if(!active)return;setMethods(result.data);if(result.data.length&&!result.data.some(item=>item.code===value))onChange(result.data[0].code)}).catch(error=>{if(active)setMessage(error instanceof Error?error.message:"Metode pembayaran belum dapat dimuat")});return()=>{active=false}},[onChange,value]);
  return <fieldset className="batpay-methods" disabled={disabled}><legend>Metode pembayaran</legend>{methods.length?<div>{methods.map(method=><button type="button" className={method.code===value?"active":""} onClick={()=>onChange(method.code)} key={method.code}><span>{method.method==="qris"?"▦":"🏦"}</span><p><b>{method.label}</b><small>{method.description}</small></p><i>{method.code===value?"✓":""}</i></button>)}</div>:<p className="batpay-method-message">{message||"Memuat metode BatPay…"}</p>}</fieldset>;
}

export function BatpayPaymentPanel({payment,onPaid,onClose}:{payment:PaymentIntent;onPaid?:()=>void;onClose?:()=>void}) {
  const [current,setCurrent]=useState(payment);
  const [message,setMessage]=useState("");
  const paidNotified=useRef(false);
  useEffect(()=>{paidNotified.current=false;setCurrent(payment)},[payment]);
  useEffect(()=>{if(current.status==="paid"&&!paidNotified.current){paidNotified.current=true;onPaid?.()}},[current.status,onPaid]);
  useEffect(()=>{if(current.status!=="pending")return;let active=true;const poll=()=>void getPaymentIntent(current.id).then(result=>{if(active)setCurrent(result)}).catch(()=>undefined);const timer=window.setInterval(poll,5000);void poll();return()=>{active=false;window.clearInterval(timer)}},[current.id,current.status]);
  async function copy(value:string,label:string){try{await navigator.clipboard.writeText(value);setMessage(`${label} berhasil disalin.`)}catch{setMessage("Browser tidak mengizinkan clipboard.")}}
  if(current.status==="paid")return <section className="batpay-result paid"><span>✓</span><h3>Pembayaran berhasil</h3><p>Transaksi sudah tercatat dan layanan sedang diproses.</p>{onClose&&<button type="button" className="primary-button full" onClick={onClose}>Selesai</button>}</section>;
  if(current.status==="failed"||current.status==="refunded")return <section className="batpay-result failed"><span>!</span><h3>{current.status==="refunded"?"Pembayaran direfund":"Pembayaran gagal"}</h3><p>{current.status==="refunded"?"Dana transaksi ini telah dikembalikan.":"Kode pembayaran sudah tidak dapat digunakan. Buat transaksi baru."}</p>{onClose&&<button type="button" className="secondary-button full" onClick={onClose}>Tutup</button>}</section>;
  return <section className="batpay-result pending"><small>BATPAY · {current.method==="qris"?"QRIS":`${current.bank_code||"BANK"} VIRTUAL ACCOUNT`}</small><h3>{current.method==="qris"?"Scan QR untuk membayar":"Transfer ke nomor virtual account"}</h3><p>{current.order_id} · {current.expires_at?`berlaku hingga ${new Date(current.expires_at).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})}`:"selesaikan dalam 15 menit"}</p>{current.method==="qris"?(current.qr_url?<img src={current.qr_url} alt="QRIS pembayaran BatPay"/>:<div className="batpay-code-placeholder">QR</div>):<div className="batpay-va"><small>Nomor Virtual Account</small><b>{current.va_number}</b>{current.va_name&&<span>a.n. {current.va_name}</span>}<button type="button" onClick={()=>void copy(current.va_number||"","Nomor VA")}>Salin nomor VA</button></div>}<strong>{new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(current.amount)}</strong><em><i/> Menunggu konfirmasi pembayaran…</em>{current.qr_url&&<button type="button" className="secondary-button" onClick={()=>void copy(current.qr_url||"","Tautan QR")}>Salin tautan QR</button>}{message&&<p className="form-message">{message}</p>}</section>;
}
