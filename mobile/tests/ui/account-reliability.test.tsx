import { beforeEach, expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { LanguageProvider } from "../../src/i18n";
import { LegalDocumentPanel } from "../../src/components/LegalDocumentPanel";
import { ChangePasswordForm } from "../../src/components/ChangePasswordForm";
import { InvoicesScreen } from "../../src/screens/InvoicesScreen";
import { ProfileScreen } from "../../src/screens/ProfileScreen";
import { getMobileInvoices, changeMobilePassword, updateMobilePetOwnerProfile } from "../../src/api";
jest.mock("../../src/api", () => ({ changeMobilePassword: jest.fn(), getMobileInvoices: jest.fn(), updateMobilePetOwnerProfile: jest.fn(), PETOWNER_API_URL: "http://localhost:0" }));
function Providers({children}:{children:ReactNode}) { return <SafeAreaProvider><LanguageProvider>{children}</LanguageProvider></SafeAreaProvider>; }
beforeEach(() => { jest.clearAllMocks(); jest.spyOn(SecureStore,"getItemAsync").mockResolvedValue(null); });
test.each(["terms","privacy"] as const)("%s consent requires scrolling to the end and explicit agreement", async policy => {
 const accept=jest.fn(); const user=userEvent.setup();
 await render(<LegalDocumentPanel policy={policy} onClose={()=>{}} onAccept={accept}/>,{wrapper:Providers});
 const button=screen.getByRole("button",{name:"Saya sudah membaca dan menyetujui"});
 expect(button).toBeDisabled(); await user.press(button);expect(accept).not.toHaveBeenCalled();
 await fireEvent.scroll(screen.getByLabelText("Isi dokumen"),{nativeEvent:{contentOffset:{y:600},layoutMeasurement:{height:500},contentSize:{height:1800}}});
 expect(button).toBeDisabled();
 await fireEvent.scroll(screen.getByLabelText("Isi dokumen"),{nativeEvent:{contentOffset:{y:1300},layoutMeasurement:{height:500},contentSize:{height:1800}}});
 expect(button).toBeEnabled();await user.press(button);expect(accept).toHaveBeenCalledTimes(1);
});
test("password change requires old password, checks confirmation, displays server rejection, and can retry",async()=>{
 const user=userEvent.setup();const notify=jest.fn();
 jest.mocked(changeMobilePassword).mockRejectedValueOnce(new Error("Password saat ini salah")).mockResolvedValue({message:"Password berhasil diperbarui"});
 await render(<ChangePasswordForm onAction={notify}/>,{wrapper:Providers});
 const button=screen.getByRole("button",{name:"Ubah password"});expect(button).toBeDisabled();
 await user.type(screen.getByLabelText("Password lama"),"Wrong#123");await user.type(screen.getByLabelText("Password baru"),"New#12345");
 expect(button).toBeDisabled();await user.type(screen.getByLabelText("Konfirmasi password baru"),"New#12345");await user.press(button);
 await waitFor(()=>expect(screen.getByText("Password saat ini salah")).toBeOnTheScreen());
 await user.clear(screen.getByLabelText("Password lama"));await user.type(screen.getByLabelText("Password lama"),"Old#12345");await user.press(button);
 await waitFor(()=>expect(notify).toHaveBeenCalled());expect(screen.getByLabelText("Password lama")).toHaveDisplayValue("");
});
test("profile saves only changed valid values and strips non-digit phone input",async()=>{
 const user=userEvent.setup();jest.mocked(updateMobilePetOwnerProfile).mockResolvedValue({full_name:"Pet Parent",phone:"081234567891",message:"Saved"});
 await render(<ProfileScreen owner={{id:"test-owner",full_name:"Pet Parent",email:"parent@example.test",phone:"081234567890",member_since:"2026-01-01"}} pets={[]} petCount={0} activityCount={0} points={0} onAction={()=>{}} onOpenNotifications={()=>{}} onOpenSupport={()=>{}} onAddPet={()=>{}} onOpenPet={()=>{}} onLogin={()=>{}} onLogout={()=>{}} onProfileChanged={async()=>{}}/>,{wrapper:Providers});
 await user.press(screen.getByRole("button",{name:"Edit profil"}));const button=screen.getByRole("button",{name:"Simpan perubahan"});expect(button).toBeDisabled();
 const phone=screen.getByLabelText("Nomor telepon");await fireEvent.changeText(phone,"08abc1234567891");expect(phone).toHaveDisplayValue("081234567891");expect(button).toBeEnabled();
 await fireEvent.changeText(phone,"");expect(button).toBeDisabled();await fireEvent.changeText(phone,"081234567891");await user.press(button);
 expect(updateMobilePetOwnerProfile).toHaveBeenCalledWith({full_name:"Pet Parent",phone:"081234567891"});
});

test("invoice category tabs request the selected category",async()=>{
 const user=userEvent.setup();
 jest.mocked(getMobileInvoices).mockResolvedValue({data:[],count:0});
 await render(<InvoicesScreen onBack={()=>{}} onAction={()=>{}} onOpenNotifications={()=>{}}/>,{wrapper:Providers});
 await waitFor(()=>expect(getMobileInvoices).toHaveBeenCalledWith(100,"all"));
 await user.press(screen.getByRole("tab",{name:"Produk toko"}));
 await waitFor(()=>expect(getMobileInvoices).toHaveBeenCalledWith(100,"shop"));
 expect(screen.getByRole("tab",{name:"Produk toko",selected:true})).toBeOnTheScreen();
});

test.each(["terms", "privacy"] as const)("%s switches complete legal copy to English and resets consent progress", async policy => {
 const accept=jest.fn();const close=jest.fn();const user=userEvent.setup();
 await render(<LegalDocumentPanel policy={policy} onClose={close} onAccept={accept}/>,{wrapper:Providers});
 await fireEvent.scroll(screen.getByLabelText("Isi dokumen"),{nativeEvent:{contentOffset:{y:1300},layoutMeasurement:{height:500},contentSize:{height:1800}}});
 expect(screen.getByRole("button",{name:"Saya sudah membaca dan menyetujui"})).toBeEnabled();
 await user.press(screen.getByRole("button",{name:"English"}));
 expect(screen.getByRole("header",{name:policy === "terms" ? "Slivadoc Terms and Conditions" : "Slivadoc Privacy Policy"})).toBeOnTheScreen();
 expect(screen.getByText(policy === "terms" ? "Language, severability, and final statement" : "Practical data protection guidance and closing provisions")).toBeOnTheScreen();
 expect(screen.getByText("Official legal references")).toBeOnTheScreen();
 expect(screen.queryByText("Penyelenggara, cakupan, dan cara menghubungi kami")).toBeNull();
 const agree=screen.getByRole("button",{name:"I have read and agree"});expect(agree).toBeDisabled();
 await fireEvent.scroll(screen.getByLabelText("Document content"),{nativeEvent:{contentOffset:{y:600},layoutMeasurement:{height:500},contentSize:{height:1800}}});
 expect(agree).toBeDisabled();
 await fireEvent.scroll(screen.getByLabelText("Document content"),{nativeEvent:{contentOffset:{y:1300},layoutMeasurement:{height:500},contentSize:{height:1800}}});
 expect(agree).toBeEnabled();await user.press(agree);expect(accept).toHaveBeenCalledTimes(1);
 await user.press(screen.getByRole("button",{name:"Back to registration"}));expect(close).toHaveBeenCalledTimes(1);
});

test("a saved English preference opens legal documents in English",async()=>{
 jest.spyOn(SecureStore,"getItemAsync").mockResolvedValue("en");
 await render(<LegalDocumentPanel policy="privacy" onClose={()=>{}} onAccept={()=>{}}/>,{wrapper:Providers});
 await waitFor(()=>expect(screen.getByRole("header",{name:"Slivadoc Privacy Policy"})).toBeOnTheScreen());
 expect(screen.getByRole("button",{name:"I have read and agree"})).toBeDisabled();
});
