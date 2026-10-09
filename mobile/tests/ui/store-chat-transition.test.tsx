import { beforeEach, afterEach, expect, jest, test } from "@jest/globals";
import { act, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { LanguageProvider } from "../../src/i18n";
import { MarketplaceScreen } from "../../src/screens/MarketplaceScreen";
import { getMobileProducts, getMobileProductReviews, createMobileMarketplaceChat, getMobileMarketplaceChatMessages, type MobileProduct } from "../../src/api";
jest.mock("../../src/api",()=>({ PETOWNER_API_URL:"http://localhost:0", getMobileProducts:jest.fn(), getMobileProductReviews:jest.fn(), createMobileMarketplaceChat:jest.fn(), getMobileMarketplaceChatMessages:jest.fn() }));
const product:MobileProduct={id:"qa-product",business_id:"qa-store",business_name:"QA Store",store_logo_url:"",store_is_online:true,store_last_seen_at:"",branch_name:"Jakarta",city:"Jakarta",name:"QA Food",sku:"QA",barcode:"",category:"food",description:"QA",image_url:"",image_urls:[],price:10000,stock:10,minimum_stock:1,available:true,rating:0,review_count:0,sold_count:0,created_at:"2026-10-08"};
function Providers({children}:{children:ReactNode}){return <SafeAreaProvider><LanguageProvider>{children}</LanguageProvider></SafeAreaProvider>;}
beforeEach(()=>{
 jest.clearAllMocks();jest.spyOn(SecureStore,"getItemAsync").mockResolvedValue(null);
 jest.mocked(getMobileProducts).mockResolvedValue({data:[product],count:1});
 jest.mocked(getMobileProductReviews).mockResolvedValue({data:[],count:0,rating:0});
 jest.mocked(createMobileMarketplaceChat).mockResolvedValue({id:"qa-thread"});
 jest.mocked(getMobileMarketplaceChatMessages).mockResolvedValue({data:[],count:0,viewer:"buyer"});
});
afterEach(()=>{jest.restoreAllMocks();});
test.each(["ios","android"] as const)("%s opens store chat after closing product detail",async os=>{
 jest.replaceProperty(Platform,"OS",os);const user=userEvent.setup();const noOp=()=>{};
 await render(<MarketplaceScreen authenticated hasPet partners={[]} favorites={[]} refreshVersion={0} onAction={noOp} onOpenNotifications={noOp} onRequireLogin={noOp} onRequirePet={noOp} onToggleFavorite={noOp} onOpenService={noOp} onExploreServices={noOp} onOpenOrders={noOp} onIntentHandled={noOp} intent={{token:1,productId:"qa-product"}}/>,{wrapper:Providers});
 await waitFor(()=>expect(screen.getByText("Chat toko")).toBeOnTheScreen());
 const detail=screen.container.queryAll(node => typeof node.props.onDismiss === "function").find(modal=>modal.props.visible);
 expect(detail).toBeDefined();
 await act(async () => { await user.press(screen.getByText("Chat toko")); });
 await waitFor(()=>expect(createMobileMarketplaceChat).toHaveBeenCalledWith({business_id:"qa-store",product_id:"qa-product"}));
 if(os==="ios") {expect(screen.queryByText("CHAT TOKO · TEKS SAJA")).toBeNull();await act(async()=>detail?.props.onDismiss());}
 await waitFor(()=>expect(screen.getByText("CHAT TOKO · TEKS SAJA")).toBeOnTheScreen());
 expect(screen.queryByText("DETAIL PRODUK")).toBeNull();
});
